import heroEverest from "@/assets/hero-everest.jpg";
import destEverest from "@/assets/dest-everest.jpg";
import destAnnapurna from "@/assets/dest-annapurna.jpg";
import destPokhara from "@/assets/dest-pokhara.jpg";
import destChitwan from "@/assets/dest-chitwan.jpg";
import destLumbini from "@/assets/dest-lumbini.jpg";
import destMustang from "@/assets/dest-mustang.jpg";
import destRara from "@/assets/dest-rara.jpg";
import destBandipur from "@/assets/dest-bandipur.jpg";
import destKathmandu from "@/assets/dest-kathmandu.jpg";
import expParagliding from "@/assets/exp-paragliding.jpg";
import ctaLodge from "@/assets/cta-lodge.jpg";

const bundledAssets: Record<string, string> = {
  "asset:src/assets/hero-everest.jpg": heroEverest,
  "asset:src/assets/dest-everest.jpg": destEverest,
  "asset:src/assets/dest-annapurna.jpg": destAnnapurna,
  "asset:src/assets/dest-pokhara.jpg": destPokhara,
  "asset:src/assets/dest-chitwan.jpg": destChitwan,
  "asset:src/assets/dest-lumbini.jpg": destLumbini,
  "asset:src/assets/dest-mustang.jpg": destMustang,
  "asset:src/assets/dest-rara.jpg": destRara,
  "asset:src/assets/dest-bandipur.jpg": destBandipur,
  "asset:src/assets/dest-kathmandu.jpg": destKathmandu,
  "asset:src/assets/exp-paragliding.jpg": expParagliding,
  "asset:src/assets/cta-lodge.jpg": ctaLodge,
};

export function resolveAssetReference(
  value: string | null | undefined,
): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return bundledAssets[value] ?? "";
}

export function getBundledAsset(
  identifier: keyof typeof bundledAssets,
): string {
  return bundledAssets[identifier] ?? "";
}
