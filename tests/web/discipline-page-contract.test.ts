import { describe, expect, it } from 'vitest';

import { routeRegistry } from '@lasoviet/config';

import type {
  PreviewData,
} from '../../apps/web/src/features/discipline-pages/discipline-page-model';
import { getDisciplinePageProvider } from '../../apps/web/src/features/discipline-pages/discipline-page-provider';
import { SiteHeader, getDisciplineNavLinks } from '../../apps/web/src/components/site-header';

describe('discipline page contract', () => {
  it('enforces the discriminated union for illustrative and backend preview data', () => {
    type SampleData = { sampleKey: string };

    const illustrativePreview: PreviewData<SampleData> = {
      sourceKind: 'illustrative',
      isIllustrative: true,
      disclosure: 'Hồ sơ minh họa phương pháp, không phải kết quả tính từ dữ liệu thật.',
      data: { sampleKey: 'preview-123' },
    };

    const backendPreview: PreviewData<SampleData> = {
      sourceKind: 'backend',
      isIllustrative: false,
      provenance: 'engine:bat-tu@1.0.0',
      data: { sampleKey: 'calc-456' },
    };

    expect(illustrativePreview.isIllustrative).toBe(true);
    expect(illustrativePreview.sourceKind).toBe('illustrative');
    expect(illustrativePreview.disclosure.length).toBeGreaterThan(0);

    expect(backendPreview.isIllustrative).toBe(false);
    expect(backendPreview.sourceKind).toBe('backend');
    expect(backendPreview.provenance.length).toBeGreaterThan(0);
  });

  it('resolves static discipline provider content for all 4 flagship preview routes across VI and EN', () => {
    const provider = getDisciplinePageProvider();
    const flagshipSlugs = ['/bat-tu', '/kinh-dich', '/chiem-tinh', '/than-so-hoc'] as const;

    for (const slug of flagshipSlugs) {
      const route = routeRegistry.find((entry) => entry.path === slug);
      expect(route, `Canonical route definition must exist for ${slug}`).toBeDefined();
      expect(route?.template).toBe('discipline-flagship');

      for (const locale of ['vi', 'en'] as const) {
        const page = provider.resolve({ route: route!, locale });
        expect(page, `Provider must resolve ${slug} for ${locale}`).toBeDefined();
        expect(page?.slug).toBe(slug);
        expect(page?.locale).toBe(locale);
        expect(page?.preview.isIllustrative).toBe(true);
        expect(page?.preview.sourceKind).toBe('illustrative');
        expect(page?.preview.disclosure).toBeTruthy();
        expect(page?.methodRows.length).toBeGreaterThan(0);
        expect(page?.limitations.length).toBeGreaterThan(0);
        expect(page?.faqs.length).toBeGreaterThan(0);
        expect(page?.glossary.length).toBeGreaterThan(0);
        expect(page?.freeValueItems.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns null when resolving an unhandled route', () => {
    const provider = getDisciplinePageProvider();
    const homeRoute = routeRegistry.find((entry) => entry.id === 'brand.home')!;
    expect(provider.resolve({ route: homeRoute, locale: 'vi' })).toBeNull();
  });

  it('provides discipline navigation links with context sensitivity and active highlighting', () => {
    const viNav = getDisciplineNavLinks('vi', '/bat-tu');
    expect(viNav).toEqual([
      { label: 'Trang chủ', href: '/', active: false },
      { label: 'Tử Vi', href: '/tu-vi', active: false },
      { label: 'Bát Tự', href: '/bat-tu', active: true },
      { label: 'Kinh Dịch', href: '/kinh-dich', active: false },
      { label: 'Chiêm Tinh', href: '/chiem-tinh', active: false },
      { label: 'Thần Số Học', href: '/than-so-hoc', active: false },
      { label: 'Kiến thức', href: '/kien-thuc', active: false },
      { label: 'Công cụ miễn phí', href: '/cong-cu-mien-phi', active: false },
    ]);

    const enNav = getDisciplineNavLinks('en', '/en/chiem-tinh');
    expect(enNav).toEqual([
      { label: 'Home', href: '/en', active: false },
      { label: 'Zi Wei', href: '/en/tu-vi', active: false },
      { label: 'BaZi', href: '/en/bat-tu', active: false },
      { label: 'I Ching', href: '/en/kinh-dich', active: false },
      { label: 'Astrology', href: '/en/chiem-tinh', active: true },
      { label: 'Numerology', href: '/en/than-so-hoc', active: false },
      { label: 'Knowledge', href: '/en/kien-thuc', active: false },
      { label: 'Free tools', href: '/en/cong-cu-mien-phi', active: false },
    ]);
  });
  it("routes default CTA to the chart form and discipline variant CTA to /tu-vi", () => {
    function extractCtaHrefs(element: any): string[] {
      const hrefs: string[] = [];
      function walk(node: any) {
        if (!node || typeof node !== "object") return;
        if (node.props?.className?.includes("button") && typeof node.props?.href === "string") {
          hrefs.push(node.props.href);
        }
        if (node.props?.children) {
          const children = Array.isArray(node.props.children)
            ? node.props.children
            : [node.props.children];
          children.forEach(walk);
        }
      }
      walk(element);
      return hrefs;
    }

    const defaultVi = SiteHeader({ locale: "vi" });
    expect(extractCtaHrefs(defaultVi)).toEqual(["/tao-la-so/tu-vi", "/tao-la-so/tu-vi"]);

    const defaultEn = SiteHeader({ locale: "en" });
    expect(extractCtaHrefs(defaultEn)).toEqual(["/en/tao-la-so/tu-vi", "/en/tao-la-so/tu-vi"]);

    const disciplineVi = SiteHeader({ locale: "vi", variant: "discipline" });
    expect(extractCtaHrefs(disciplineVi)).toEqual(["/tu-vi", "/tu-vi"]);

    const disciplineEn = SiteHeader({ locale: "en", variant: "discipline" });
    expect(extractCtaHrefs(disciplineEn)).toEqual(["/en/tu-vi", "/en/tu-vi"]);
  });
});
