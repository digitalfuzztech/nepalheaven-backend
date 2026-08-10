import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import ts from "typescript";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing. Configure .env first.");
  process.exit(1);
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "src/lib/site-data.ts");
const manifestKey = "seed.nepal-heaven.manifest.v1";
const stableNamespace = "nepal-heaven-static-content-v1";

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
    INSERT INTO site_settings (id, key, value, updated_at)
    VALUES (${id}, ${key}, ${JSON.stringify(value)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
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
      await tx`DELETE FROM ${tx(table)} WHERE id = ANY(${tx.array(staleIds, "uuid")})`;
    }
  }

  const currentSettingKeys = new Set(currentManifest.settingKeys);
  const staleSettingKeys = (previousManifest.settingKeys ?? []).filter(
    (key) => !currentSettingKeys.has(key),
  );
  if (staleSettingKeys.length) {
    await tx`DELETE FROM site_settings WHERE key = ANY(${tx.array(staleSettingKeys, "text")})`;
  }
}

const { data, assetImportCount } = await loadSiteData();
const sql = postgres(connectionString, { prepare: false });

try {
  const summary = await sql.begin(async (tx) => {
    const previousManifestRows =
      await tx`SELECT value FROM site_settings WHERE key = ${manifestKey} LIMIT 1`;
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

    for (const [destinationSortOrder, destination] of data.destinations.entries()) {
      const id = stableUuid(`destinations:${destination.slug}`);
      const altitude = parseAltitude(destination.altitude);
      const [row] = await tx`
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
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          short_description = EXCLUDED.short_description,
          description = EXCLUDED.description,
          hero_image = EXCLUDED.hero_image,
          region = EXCLUDED.region,
          category = EXCLUDED.category,
          difficulty = EXCLUDED.difficulty,
          duration = EXCLUDED.duration,
          altitude_label = EXCLUDED.altitude_label,
          min_altitude = EXCLUDED.min_altitude,
          max_altitude = EXCLUDED.max_altitude,
          elevation = EXCLUDED.elevation,
          best_season = EXCLUDED.best_season,
          sort_order = EXCLUDED.sort_order,
          status = true,
          updated_at = NOW()
        RETURNING id
      `;
      destinationIds.set(destination.slug, row.id);

      for (const [index, item] of destination.highlights.entries()) {
        const childId = stableUuid(
          `destination_highlights:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_highlights", childId);
        await tx`
          INSERT INTO destination_highlights (id, destination_id, item, sort_order)
          VALUES (${childId}, ${row.id}, ${item}, ${index})
          ON CONFLICT (id) DO UPDATE SET destination_id = EXCLUDED.destination_id, item = EXCLUDED.item, sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [index, item] of destination.tips.entries()) {
        const childId = stableUuid(
          `destination_tips:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_tips", childId);
        await tx`
          INSERT INTO destination_tips (id, destination_id, item, sort_order)
          VALUES (${childId}, ${row.id}, ${item}, ${index})
          ON CONFLICT (id) DO UPDATE SET destination_id = EXCLUDED.destination_id, item = EXCLUDED.item, sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [index, item] of destination.itinerary.entries()) {
        const childId = stableUuid(
          `destination_itineraries:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_itineraries", childId);
        await tx`
          INSERT INTO destination_itineraries (id, destination_id, day_label, title, description, sort_order)
          VALUES (${childId}, ${row.id}, ${item.day}, ${item.title}, ${item.detail}, ${index})
          ON CONFLICT (id) DO UPDATE SET
            destination_id = EXCLUDED.destination_id,
            day_label = EXCLUDED.day_label,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [index, item] of destination.included.entries()) {
        const childId = stableUuid(
          `destination_inclusions:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_inclusions", childId);
        await tx`
          INSERT INTO destination_inclusions (id, destination_id, item, sort_order)
          VALUES (${childId}, ${row.id}, ${item}, ${index})
          ON CONFLICT (id) DO UPDATE SET destination_id = EXCLUDED.destination_id, item = EXCLUDED.item, sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [index, item] of destination.excluded.entries()) {
        const childId = stableUuid(
          `destination_exclusions:${destination.slug}:${index}`,
        );
        addManifestId(manifest, "destination_exclusions", childId);
        await tx`
          INSERT INTO destination_exclusions (id, destination_id, item, sort_order)
          VALUES (${childId}, ${row.id}, ${item}, ${index})
          ON CONFLICT (id) DO UPDATE SET destination_id = EXCLUDED.destination_id, item = EXCLUDED.item, sort_order = EXCLUDED.sort_order
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
      const [row] = await tx`
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
        ON CONFLICT (slug) DO UPDATE SET
          destination_id = EXCLUDED.destination_id,
          destination_label = EXCLUDED.destination_label,
          title = EXCLUDED.title,
          style = EXCLUDED.style,
          short_description = EXCLUDED.short_description,
          days = EXCLUDED.days,
          difficulty = EXCLUDED.difficulty,
          starting_price = EXCLUDED.starting_price,
          old_price = EXCLUDED.old_price,
          currency = EXCLUDED.currency,
          rating = EXCLUDED.rating,
          review_count = EXCLUDED.review_count,
          hero_image = EXCLUDED.hero_image,
          sort_order = EXCLUDED.sort_order,
          status = true,
          updated_at = NOW()
        RETURNING id
      `;
      packageIds.set(packageItem.slug, row.id);

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
          VALUES (${childId}, ${row.id}, ${destinationId}, ${index})
          ON CONFLICT (package_id, destination_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [index, item] of packageItem.highlights.entries()) {
        const childId = stableUuid(
          `package_highlights:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_highlights", childId);
        await tx`
          INSERT INTO package_highlights (id, package_id, item, sort_order)
          VALUES (${childId}, ${row.id}, ${item}, ${index})
          ON CONFLICT (id) DO UPDATE SET package_id = EXCLUDED.package_id, item = EXCLUDED.item, sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [index, item] of packageItem.tiers.entries()) {
        const childId = stableUuid(
          `package_tiers:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_tiers", childId);
        await tx`
          INSERT INTO package_tiers (id, package_id, name, description, price, currency, sort_order)
          VALUES (${childId}, ${row.id}, ${item.name}, ${item.note}, ${item.price}, 'USD', ${index})
          ON CONFLICT (id) DO UPDATE SET
            package_id = EXCLUDED.package_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            currency = EXCLUDED.currency,
            sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [index, item] of packageItem.itinerary.entries()) {
        const childId = stableUuid(
          `package_itineraries:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_itineraries", childId);
        await tx`
          INSERT INTO package_itineraries (id, package_id, day, day_label, title, description, sort_order)
          VALUES (${childId}, ${row.id}, NULL, ${item.day}, ${item.title}, ${item.detail}, ${index})
          ON CONFLICT (id) DO UPDATE SET
            package_id = EXCLUDED.package_id,
            day = NULL,
            day_label = EXCLUDED.day_label,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [index, item] of packageItem.included.entries()) {
        const childId = stableUuid(
          `package_inclusions:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_inclusions", childId);
        await tx`
          INSERT INTO package_inclusions (id, package_id, item, sort_order)
          VALUES (${childId}, ${row.id}, ${item}, ${index})
          ON CONFLICT (id) DO UPDATE SET package_id = EXCLUDED.package_id, item = EXCLUDED.item, sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [index, item] of packageItem.excluded.entries()) {
        const childId = stableUuid(
          `package_exclusions:${packageItem.slug}:${index}`,
        );
        addManifestId(manifest, "package_exclusions", childId);
        await tx`
          INSERT INTO package_exclusions (id, package_id, item, sort_order)
          VALUES (${childId}, ${row.id}, ${item}, ${index})
          ON CONFLICT (id) DO UPDATE SET package_id = EXCLUDED.package_id, item = EXCLUDED.item, sort_order = EXCLUDED.sort_order
        `;
      }
    }

    const categoryIds = new Map();
    for (const categoryName of [
      ...new Set(data.posts.map((post) => post.category)),
    ]) {
      const slug = slugify(categoryName);
      const id = stableUuid(`blog_categories:${slug}`);
      addManifestId(manifest, "blog_categories", id);
      const [row] = await tx`
        INSERT INTO blog_categories (id, name, slug)
        VALUES (${id}, ${categoryName}, ${slug})
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      categoryIds.set(categoryName, row.id);
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
        ON CONFLICT (slug) DO UPDATE SET
          category_id = EXCLUDED.category_id,
          title = EXCLUDED.title,
          excerpt = EXCLUDED.excerpt,
          content = EXCLUDED.content,
          cover_image = EXCLUDED.cover_image,
          author_name = EXCLUDED.author_name,
          author_role = EXCLUDED.author_role,
          reading_time_minutes = EXCLUDED.reading_time_minutes,
          status = EXCLUDED.status,
          published_at = EXCLUDED.published_at,
          updated_at = NOW()
      `;
    }

    for (const [testimonialSortOrder, testimonial] of data.testimonials.entries()) {
      const id = stableUuid(
        `testimonials:${testimonial.name}:${testimonial.trip}`,
      );
      addManifestId(manifest, "testimonials", id);
      await tx`
        INSERT INTO testimonials (id, name, location, content, rating, trip_name, sort_order, status, updated_at)
        VALUES (${id}, ${testimonial.name}, ${testimonial.country}, ${testimonial.quote}, ${String(testimonial.rating)}, ${testimonial.trip}, ${testimonialSortOrder}, 'published', NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          content = EXCLUDED.content,
          rating = EXCLUDED.rating,
          trip_name = EXCLUDED.trip_name,
          sort_order = EXCLUDED.sort_order,
          status = EXCLUDED.status,
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
          VALUES (${id}, ${item.q}, ${item.a}, ${group.category}, ${String(faqSortOrder)}, 'published')
          ON CONFLICT (id) DO UPDATE SET
            question = EXCLUDED.question,
            answer = EXCLUDED.answer,
            category = EXCLUDED.category,
            sort_order = EXCLUDED.sort_order,
            status = EXCLUDED.status
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
    ];
    for (const [key, value] of settings)
      await upsertSetting(tx, key, value, manifest);

    await synchronizeManifestRows(tx, previousManifest, manifest);
    await tx`
      INSERT INTO site_settings (id, key, value, updated_at)
      VALUES (${stableUuid(`site_settings:${manifestKey}`)}, ${manifestKey}, ${JSON.stringify(manifest)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
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
    };
  });

  console.log("Nepal Heaven static content synchronized successfully.");
  console.table(summary);
} finally {
  await sql.end();
}
