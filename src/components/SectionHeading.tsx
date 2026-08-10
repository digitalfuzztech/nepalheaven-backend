import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "dark",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2
        className={cn(
          "mt-5 text-[2rem] leading-[1.05] sm:text-4xl lg:text-[3.1rem]",
          tone === "light" ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {title}
      </h2>
      <span
        className={cn(
          "mt-6 block h-px w-24 bg-linear-to-r from-gold to-transparent",
          align === "center" && "mx-auto from-transparent via-gold to-transparent",
        )}
        aria-hidden
      />
      {description ? (
        <p
          className={cn(
            "mt-6 text-base leading-relaxed sm:text-[1.05rem]",
            tone === "light" ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      ) : null}

    </div>
  );
}
