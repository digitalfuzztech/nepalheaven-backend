import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import ts from "typescript";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing. Configure .env first.");
  process.exit(1);
}
if (!/^mysql:\/\//i.test(connectionString)) {
  console.error("DATABASE_URL must use the mysql:// scheme.");
  process.exit(1);
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "src/lib/site-data.ts");
const manifestKey = "seed.nepal-heaven.manifest.v1";
const stableNamespace = "nepal-heaven-static-content-v1";

function createSqlClient(connection) {
  const execute = async (strings, values) => {
    let statement = "";
    const parameters = [];
    for (let index = 0; index < strings.length; index += 1) {
      statement += strings[index];
      if (index >= values.length) continue;
      const value = values[index];
      if (value?.kind === "identifier") {
        if (!/^[a-z_][a-z0-9_]*$/i.test(value.value))
          throw new Error(`Unsafe SQL identifier: ${value.value}`);
        statement += `\`${value.value}\``;
      } else if (value?.kind === "array") {
        if (!value.value.length) throw new Error("SQL array cannot be empty.");
        statement += `(${value.value.map(() => "?").join(", ")})`;
        parameters.push(...value.value);
      } else {
        statement += "?";
        parameters.push(value);
      }
    }
    statement = statement.trim();
    const [result] = await connection.query(statement, parameters);
    return result;
  };
  const tag = (strings, ...values) => {
    if (typeof strings === "string")
      return { kind: "identifier", value: strings };
    return execute(strings, values);
  };
  tag.array = (value) => ({ kind: "array", value });
  tag.begin = async (callback) => {
    await connection.beginTransaction();
    try {
      const result = await callback(tag);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  };
  tag.end = () => connection.end();
  return tag;
}

function stableUuid(key) {
  const bytes = Buffer.from(
    createHash("sha1")
      .update(`${stableNamespace}:${key}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseAltitude(label) {
  const values = [...label.matchAll(/\d[\d,]*/g)].map(([value]) =>
    Number(value.replaceAll(",", "")),
  );
  if (!values.length || values.some((value) => !Number.isInteger(value))) {
    throw new Error(`Unable to parse altitude label: ${label}`);
  }
  return { min: Math.min(...values), max: Math.max(...values) };
}

function packageDifficulty(value) {
  const normalized = value.toLowerCase();
  if (["easy", "moderate", "challenging", "extreme"].includes(normalized))
    return normalized;
  if (normalized === "strenuous") return "extreme";
  throw new Error(`Unsupported package difficulty: ${value}`);
}

function parsePublishedAt(value) {
  const date = new Date(`${value} 00:00:00 UTC`);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Unable to parse publication date: ${value}`);
  return date;
}

async function loadSiteData() {
  const source = await readFile(sourcePath, "utf8");
  let assetImportCount = 0;
  const importFreeSource = source.replace(
    /import\s+(\w+)\s+from\s+["']@\/assets\/([^"']+)["'];?/g,
    (_match, identifier, assetPath) => {
      assetImportCount += 1;
      return `const ${identifier} = ${JSON.stringify(`asset:src/assets/${assetPath}`)};`;
    },
  );

  if (/@\/assets\//.test(importFreeSource)) {
    throw new Error(
      "site-data.ts contains an asset import that the content seed cannot safely resolve.",
    );
  }

  const compiled = ts.transpileModule(importFreeSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors =
    compiled.diagnostics?.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ) ?? [];
  if (errors.length) {
    throw new Error(
      `Unable to compile site-data.ts: ${errors.map((error) => error.messageText).join("; ")}`,
    );
  }

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`;
  return { data: await import(moduleUrl), assetImportCount };
}

function addManifestId(manifest, table, id) {
  (manifest.tables[table] ??= []).push(id);
}

async function upsertSetting(tx, key, value, manifest) {
  const id = stableUuid(`site_settings:${key}`);
  await tx`
    INSERT INTO site_settings (id, \`key\`, value, updated_at)
    VALUES (${id}, ${key}, ${JSON.stringify(value)}, NOW())
    ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()
  `;
  manifest.settingKeys.push(key);
}

function matchedDestinationSlugs(destinationLabel, destinations) {
  const lowerLabel = destinationLabel.toLowerCase();
  return destinations
    .map((destination) => ({
      slug: destination.slug,
      index: lowerLabel.indexOf(destination.name.toLowerCase()),
    }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index)
    .map(({ slug }) => slug);
}

async function synchronizeManifestRows(tx, previousManifest, currentManifest) {
  const safeTables = new Set([
    "destination_highlights",
    "destination_tips",
    "destination_itineraries",
    "destination_inclusions",
    "destination_exclusions",
    "package_destinations",
    "package_highlights",
    "package_tiers",
    "package_itineraries",
    "package_inclusions",
    "package_exclusions",
    "experience_categories",
    "experience_highlights",
    "experience_packages",
    "blog_posts",
    "blog_categories",
    "testimonials",
    "faqs",
  ]);

  for (const [table, previousIds] of Object.entries(
    previousManifest.tables ?? {},
  )) {
    if (!safeTables.has(table))
      throw new Error(
        `Refusing to synchronize unexpected seed table: ${table}`,
      );
    const currentIds = new Set(currentManifest.tables[table] ?? []);
    const staleIds = previousIds.filter((id) => !currentIds.has(id));
    if (staleIds.length) {
      await tx`DELETE FROM ${tx(table)} WHERE id IN ${tx.array(staleIds)}`;
    }
  }

  const currentSettingKeys = new Set(currentManifest.settingKeys);
  const staleSettingKeys = (previousManifest.settingKeys ?? []).filter(
    (key) => !currentSettingKeys.has(key),
  );
  if (staleSettingKeys.length) {
    await tx`DELETE FROM site_settings WHERE \`key\` IN ${tx.array(staleSettingKeys)}`;
  }
}

const { data, assetImportCount } = await loadSiteData();
const connection = await mysql.createConnection({
  uri: connectionString,
  timezone: "Z",
});
const sql = createSqlClient(connection);

try {
  const summary = await sql.begin(async (tx) => {
    const previousManifestRows =
      await tx`SELECT value FROM site_settings WHERE \`key\` = ${manifestKey} LIMIT 1`;
    const previousManifest = previousManifestRows.length
      ? JSON.parse(previousManifestRows[0].value ?? "{}")
      : {};
    const manifest = {
      version: 1,
      source: "src/lib/site-data.ts",
      tables: {},
      settingKeys: [],
    };
    const destinationIds = new Map();
    const packageIds = new Map();

    for (const [
      destinationSortOrder,
      destination,
    ] of data.destinations.entries()) {
      const id = stableUuid(`destinations:${destination.slug}`);
      const altitude = parseAltitude(destination.altitude);
      await tx`
        INSERT INTO destinations (
          id, name, slug, short_description, description, hero_image, region, category,
          difficulty, duration, altitude_label, min_altitude, max_altitude, elevation,
          best_season, sort_order, status, updated_at
        ) VALUES (
          ${id}, ${destination.name}, ${destination.slug}, ${destination.short}, ${destination.description},
          ${destination.image}, ${destination.region}, ${destination.category}, ${destination.difficulty},
          ${destination.duration}, ${destination.altitude}, ${altitude.min}, ${altitude.max}, ${altitude.max},
          ${destination.season}, ${destinationSortOrder}, true, NOW()
        )
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          short_description = VALUES(short_description),
          description = VALUES(description),
          hero_image = VALUES(hero_image),
          region = VALUES(region),
          category = VALUES(category),
          difficulty = VALUES(difficulty),
          duration = VALUES(duration),
          altitude_label = VALUES(altitude_label),
          min_altitude = VALUES(min_altitude),
          max_altitude = VALUES(max_altitude),
          elevation = VALUES(elevation),
          best_season = VALUES(best_season),
          sort_order = VALUES(sort_order),
          status = true,
          updated_at = NOW()
      `;
      const [destinationRow] = await tx`
        SELECT id FROM destinations WHERE slug = ${destination.slug} LIMIT 1
      `;
      if (!destinationRow)
        throw new Error(`Destination upsert failed: ${destination.slug}`);
      destinationIds.set(destination.slug, destinationRow.id);

      for (const [index, item] of destination.highlights.entries()) {
        const childId = stableUuid(
          `destination_highlights:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_highlights", childId);
        await tx`
          INSERT INTO destination_highlights (id, destination_id, item, sort_order)
          VALUES (${childId}, ${destinationRow.id}, ${item}, ${index})
          ON DUPLICATE KEY UPDATE destination_id = VALUES(destination_id), item = VALUES(item), sort_order = VALUES(sort_order)
        `;
      }
      for (const [index, item] of destination.tips.entries()) {
        const childId = stableUuid(
          `destination_tips:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_tips", childId);
        await tx`
          INSERT INTO destination_tips (id, destination_id, item, sort_order)
          VALUES (${childId}, ${destinationRow.id}, ${item}, ${index})
          ON DUPLICATE KEY UPDATE destination_id = VALUES(destination_id), item = VALUES(item), sort_order = VALUES(sort_order)
        `;
      }
      for (const [index, item] of destination.itinerary.entries()) {
        const childId = stableUuid(
          `destination_itineraries:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_itineraries", childId);
        await tx`
          INSERT INTO destination_itineraries (id, destination_id, day_label, title, description, sort_order)
          VALUES (${childId}, ${destinationRow.id}, ${item.day}, ${item.title}, ${item.detail}, ${index})
          ON DUPLICATE KEY UPDATE
            destination_id = VALUES(destination_id),
            day_label = VALUES(day_label),
            title = VALUES(title),
            description = VALUES(description),
            sort_order = VALUES(sort_order)
        `;
      }
      for (const [index, item] of destination.included.entries()) {
        const childId = stableUuid(
          `destination_inclusions:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_inclusions", childId);
        await tx`
          INSERT INTO destination_inclusions (id, destination_id, item, sort_order)
          VALUES (${childId}, ${destinationRow.id}, ${item}, ${index})
          ON DUPLICATE KEY UPDATE destination_id = VALUES(destination_id), item = VALUES(item), sort_order = VALUES(sort_order)
        `;
      }
      for (const [index, item] of destination.excluded.entries()) {
        const childId = stableUuid(
          `destination_exclusions:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_exclusions", childId);
        await tx`
          INSERT INTO destination_exclusions (id, destination_id, item, sort_order)
          VALUES (${childId}, ${destinationRow.id}, ${item}, ${index})
          ON DUPLICATE KEY UPDATE destination_id = VALUES(destination_id), item = VALUES(item), sort_order = VALUES(sort_order)
        `;
      }
    }

    for (const [packageSortOrder, packageItem] of data.packages.entries()) {
      const id = stableUuid(`packages:${packageItem.slug}`);
      const relatedSlugs = matchedDestinationSlugs(
        packageItem.destination,
        data.destinations,
      );
      const firstLabelPart = packageItem.destination
        .split(/\s*(?:·|&)\s*/u)[0]
        .toLowerCase();
      const primarySlug = relatedSlugs.find((slug) => {
        const destination = data.destinations.find(
          (item) => item.slug === slug,
        );
        return (
          destination && firstLabelPart.includes(destination.name.toLowerCase())
        );
      });
      const primaryDestinationId = primarySlug
        ? destinationIds.get(primarySlug)
        : null;
      await tx`
        INSERT INTO packages (
          id, destination_id, destination_label, title, slug, style, short_description,
          days, difficulty, starting_price, old_price, currency, rating, review_count,
          hero_image, sort_order, status, updated_at
        ) VALUES (
          ${id}, ${primaryDestinationId ?? null}, ${packageItem.destination}, ${packageItem.title},
          ${packageItem.slug}, ${packageItem.style}, ${packageItem.short}, ${packageItem.days},
          ${packageDifficulty(packageItem.difficulty)}, ${packageItem.price}, ${packageItem.oldPrice ?? null},
          'USD', ${packageItem.rating}, ${packageItem.reviews}, ${packageItem.image}, ${packageSortOrder}, true, NOW()
        )
        ON DUPLICATE KEY UPDATE
          destination_id = VALUES(destination_id),
          destination_label = VALUES(destination_label),
          title = VALUES(title),
          style = VALUES(style),
          short_description = VALUES(short_description),
          days = VALUES(days),
          difficulty = VALUES(difficulty),
          starting_price = VALUES(starting_price),
          old_price = VALUES(old_price),
          currency = VALUES(currency),
          rating = VALUES(rating),
          review_count = VALUES(review_count),
          hero_image = VALUES(hero_image),
          sort_order = VALUES(sort_order),
          status = true,
          updated_at = NOW()
      `;
      const [packageRow] = await tx`
        SELECT id FROM packages WHERE slug = ${packageItem.slug} LIMIT 1
      `;
      if (!packageRow)
        throw new Error(`Package upsert failed: ${packageItem.slug}`);
      packageIds.set(packageItem.slug, packageRow.id);

      for (const [index, destinationSlug] of relatedSlugs.entries()) {
        const destinationId = destinationIds.get(destinationSlug);
        if (!destinationId)
          throw new Error(`Missing destination ID for ${destinationSlug}`);
        const childId = stableUuid(
          `package_destinations:${packageItem.slug}:${destinationSlug}`,
        );
        addManifestId(manifest, "package_destinations", childId);
        await tx`
          INSERT INTO package_destinations (id, package_id, destination_id, sort_order)
          VALUES (${childId}, ${packageRow.id}, ${destinationId}, ${index})
          ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)
        `;
      }
      for (const [index, item] of packageItem.highlights.entries()) {
        const childId = stableUuid(
          `package_highlights:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_highlights", childId);
        await tx`
          INSERT INTO package_highlights (id, package_id, item, sort_order)
          VALUES (${childId}, ${packageRow.id}, ${item}, ${index})
          ON DUPLICATE KEY UPDATE package_id = VALUES(package_id), item = VALUES(item), sort_order = VALUES(sort_order)
        `;
      }
      for (const [index, item] of packageItem.tiers.entries()) {
        const childId = stableUuid(
          `package_tiers:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_tiers", childId);
        await tx`
          INSERT INTO package_tiers (id, package_id, name, description, price, currency, sort_order)
          VALUES (${childId}, ${packageRow.id}, ${item.name}, ${item.note}, ${item.price}, 'USD', ${index})
          ON DUPLICATE KEY UPDATE
            package_id = VALUES(package_id),
            name = VALUES(name),
            description = VALUES(description),
            price = VALUES(price),
            currency = VALUES(currency),
            sort_order = VALUES(sort_order)
        `;
      }
      for (const [index, item] of packageItem.itinerary.entries()) {
        const childId = stableUuid(
          `package_itineraries:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_itineraries", childId);
        await tx`
          INSERT INTO package_itineraries (id, package_id, day, day_label, title, description, sort_order)
          VALUES (${childId}, ${packageRow.id}, NULL, ${item.day}, ${item.title}, ${item.detail}, ${index})
          ON DUPLICATE KEY UPDATE
            package_id = VALUES(package_id),
            day = NULL,
            day_label = VALUES(day_label),
            title = VALUES(title),
            description = VALUES(description),
            sort_order = VALUES(sort_order)
        `;
      }
      for (const [index, item] of packageItem.included.entries()) {
        const childId = stableUuid(
          `package_inclusions:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_inclusions", childId);
        await tx`
          INSERT INTO package_inclusions (id, package_id, item, sort_order)
          VALUES (${childId}, ${packageRow.id}, ${item}, ${index})
          ON DUPLICATE KEY UPDATE package_id = VALUES(package_id), item = VALUES(item), sort_order = VALUES(sort_order)
        `;
      }
      for (const [index, item] of packageItem.excluded.entries()) {
        const childId = stableUuid(
          `package_exclusions:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_exclusions", childId);
        await tx`
          INSERT INTO package_exclusions (id, package_id, item, sort_order)
          VALUES (${childId}, ${packageRow.id}, ${item}, ${index})
          ON DUPLICATE KEY UPDATE package_id = VALUES(package_id), item = VALUES(item), sort_order = VALUES(sort_order)
        `;
      }
    }

    for (const [sortOrder, experience] of data.experienceCategories.entries()) {
      const id = stableUuid(`experience_categories:${experience.slug}`);
      addManifestId(manifest, "experience_categories", id);
      await tx`INSERT INTO experience_categories (id, slug, name, short_description, description, hero_image, sort_order, status, seo_title, seo_description, updated_at)
        VALUES (${id}, ${experience.slug}, ${experience.name}, ${experience.detail}, ${experience.description}, ${experience.image}, ${sortOrder}, true, ${`${experience.name} Experiences in Nepal | Nepal Heaven`}, ${experience.detail}, NOW())
        ON DUPLICATE KEY UPDATE name=VALUES(name), short_description=VALUES(short_description), description=VALUES(description), hero_image=VALUES(hero_image), sort_order=VALUES(sort_order), status=true, seo_title=VALUES(seo_title), seo_description=VALUES(seo_description), updated_at=NOW()`;
      const [row] = await tx`SELECT id FROM experience_categories WHERE slug=${experience.slug} LIMIT 1`;
      if (!row) throw new Error(`Experience upsert failed: ${experience.slug}`);
      for (const [index, item] of experience.highlights.entries()) {
        const childId = stableUuid(`experience_highlights:${experience.slug}:${index}`); addManifestId(manifest, "experience_highlights", childId);
        await tx`INSERT INTO experience_highlights (id, experience_id, item, sort_order) VALUES (${childId}, ${row.id}, ${item}, ${index}) ON DUPLICATE KEY UPDATE experience_id=VALUES(experience_id), item=VALUES(item), sort_order=VALUES(sort_order)`;
      }
      for (const [index, packageSlug] of (data.experiencePackageMappings[experience.slug] ?? []).entries()) {
        const packageId = packageIds.get(packageSlug); if (!packageId) throw new Error(`Experience ${experience.slug} references missing package ${packageSlug}`);
        const childId = stableUuid(`experience_packages:${experience.slug}:${packageSlug}`); addManifestId(manifest, "experience_packages", childId);
        await tx`INSERT INTO experience_packages (id, experience_id, package_id, sort_order) VALUES (${childId}, ${row.id}, ${packageId}, ${index}) ON DUPLICATE KEY UPDATE experience_id=VALUES(experience_id), package_id=VALUES(package_id), sort_order=VALUES(sort_order)`;
      }
    }

    const categoryIds = new Map();
    for (const categoryName of [
      ...new Set(data.posts.map((post) => post.category)),
    ]) {
      const slug = slugify(categoryName);
      const id = stableUuid(`blog_categories:${slug}`);
      addManifestId(manifest, "blog_categories", id);
      await tx`
        INSERT INTO blog_categories (id, name, slug)
        VALUES (${id}, ${categoryName}, ${slug})
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `;
      const [categoryRow] = await tx`
        SELECT id FROM blog_categories WHERE slug = ${slug} LIMIT 1
      `;
      if (!categoryRow) throw new Error(`Blog category upsert failed: ${slug}`);
      categoryIds.set(categoryName, categoryRow.id);
    }

    for (const post of data.posts) {
      const id = stableUuid(`blog_posts:${post.slug}`);
      addManifestId(manifest, "blog_posts", id);
      const readingTimeMinutes = Number.parseInt(post.readingTime, 10);
      if (!Number.isInteger(readingTimeMinutes))
        throw new Error(`Unable to parse reading time: ${post.readingTime}`);
      await tx`
        INSERT INTO blog_posts (
          id, category_id, title, slug, excerpt, content, cover_image, author_name,
          author_role, reading_time_minutes, status, published_at, updated_at
        ) VALUES (
          ${id}, ${categoryIds.get(post.category)}, ${post.title}, ${post.slug}, ${post.excerpt},
          ${post.body.join("\n\n")}, ${post.image}, ${post.author.name}, ${post.author.role},
          ${readingTimeMinutes}, 'published', ${parsePublishedAt(post.date)}, NOW()
        )
        ON DUPLICATE KEY UPDATE
          category_id = VALUES(category_id),
          title = VALUES(title),
          excerpt = VALUES(excerpt),
          content = VALUES(content),
          cover_image = VALUES(cover_image),
          author_name = VALUES(author_name),
          author_role = VALUES(author_role),
          reading_time_minutes = VALUES(reading_time_minutes),
          status = VALUES(status),
          published_at = VALUES(published_at),
          updated_at = NOW()
      `;
    }

    for (const [
      testimonialSortOrder,
      testimonial,
    ] of data.testimonials.entries()) {
      const id = stableUuid(
        `testimonials:${testimonial.name}:${testimonial.trip}`,
      );
      addManifestId(manifest, "testimonials", id);
      await tx`
        INSERT INTO testimonials (id, name, location, content, rating, trip_name, sort_order, status, updated_at)
        VALUES (${id}, ${testimonial.name}, ${testimonial.country}, ${testimonial.quote}, ${String(testimonial.rating)}, ${testimonial.trip}, ${testimonialSortOrder}, 'published', NOW())
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          location = VALUES(location),
          content = VALUES(content),
          rating = VALUES(rating),
          trip_name = VALUES(trip_name),
          sort_order = VALUES(sort_order),
          status = VALUES(status),
          updated_at = NOW()
      `;
    }

    let faqSortOrder = 0;
    for (const group of data.faqs) {
      for (const item of group.items) {
        const id = stableUuid(`faqs:${group.category}:${item.q}`);
        addManifestId(manifest, "faqs", id);
        await tx`
          INSERT INTO faqs (id, question, answer, category, sort_order, status)
          VALUES (${id}, ${item.q}, ${item.a}, ${group.category}, ${faqSortOrder}, 'published')
          ON DUPLICATE KEY UPDATE
            question = VALUES(question),
            answer = VALUES(answer),
            category = VALUES(category),
            sort_order = VALUES(sort_order),
            status = VALUES(status)
        `;
        faqSortOrder += 1;
      }
    }

    const { hours, ...companyProfile } = data.company;
    const settings = [
      ["company.profile", companyProfile],
      ["company.hours", hours],
      ["home.activities", data.activities],
      ["experiences.categories", data.experienceCategories],
      ["home.stats", data.stats],
      ["gallery.items", data.galleryItems],
      ["about.team", data.team],
      ["about.milestones", data.milestones],
      ["about.awards", data.awards],
      ["about.partners", data.partners],
      ["home.why_us", data.whyUs],
      ["assets.images", data.images],
      ["booking.vat_enabled", false],
      ["booking.vat_percentage", 0],
      ["booking.minimum_deposit_percentage", 60],
      ["booking.minimum_advance_percentage", 60],
      ["booking.balance_due_days_before_departure", 0],
      ["booking.default_cancellation_fee_percentage", 0],
    ];
    for (const [key, value] of settings)
      await upsertSetting(tx, key, value, manifest);

    await synchronizeManifestRows(tx, previousManifest, manifest);
    await tx`
      INSERT INTO site_settings (id, \`key\`, value, updated_at)
      VALUES (${stableUuid(`site_settings:${manifestKey}`)}, ${manifestKey}, ${JSON.stringify(manifest)}, NOW())
      ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()
    `;

    return {
      destinations: data.destinations.length,
      packages: data.packages.length,
      packageTiers: data.packages.reduce(
        (count, item) => count + item.tiers.length,
        0,
      ),
      blogPosts: data.posts.length,
      testimonials: data.testimonials.length,
      faqs: data.faqs.reduce((count, group) => count + group.items.length, 0),
      assetImports: assetImportCount,
      packageDestinationLinks:
        manifest.tables.package_destinations?.length ?? 0,
      experiences: data.experienceCategories.length,
      experiencePackageLinks: manifest.tables.experience_packages?.length ?? 0,
    };
  });

  console.log("Nepal Heaven static content synchronized successfully.");
  console.table(summary);
} finally {
  await sql.end();
}
