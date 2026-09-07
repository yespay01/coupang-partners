# SEO 최적화 작업 정리 (2026-02-19)

## 개요
Google Search Console 색인 이슈 해결 및 SEO 자동화 구축 작업 기록.

---

## 1. 사이트맵(sitemap.xml) 자동화

### 구조
- **기존**: `public/sitemap.xml` 정적 파일 → 제품 추가 시 수동 업데이트 필요
- **현재**: Firebase Cloud Function(`sitemap`) → Firestore 데이터 기반 동적 생성

### 작동 방식
`https://www.yespos.co.kr/sitemap.xml` 접속 시 Cloud Function이 실행되어 실시간으로 XML 생성.

#### 포함되는 URL 목록 (자동)

| 구분 | 출처 | 우선순위 |
|------|------|----------|
| 정적 페이지 (홈, 제품목록, 개인정보처리방침 등) | 코드 하드코딩 | 0.3 ~ 1.0 |
| 카테고리 페이지 | `settings/productSettings.hierarchicalCategories` | 0.8 |
| AI 생성 제품 페이지 | `settings/productSettings.products` (맵 키) | 0.7 |
| AI 생성 제품 페이지 (하위호환) | `settings/productSettings.uncategorizedProducts` | 0.7 |
| AI 히스토리 페이지 | `aiGeneratedPages` 컬렉션 | 0.7 |
| AI 페이지 | `aiPages` 컬렉션 | 0.7 |
| 랜딩 페이지 | `landingPages` 컬렉션 (isActive: true만) | 0.8 |

#### 캐시 설정
- `Cache-Control: public, max-age=3600` (1시간 캐시)

### 관련 파일
- **Cloud Function**: `functions/index.js` → `exports.sitemap` (파일 하단)
- **라우팅**: `firebase.json` → rewrites에 `/sitemap.xml` → `sitemap` function 매핑

```json
// firebase.json
"rewrites": [
  {
    "source": "/sitemap.xml",
    "function": { "functionId": "sitemap", "region": "us-central1" }
  },
  { "source": "**", "destination": "/index.html" }
]
```

> ⚠️ `public/sitemap.xml` 파일이 존재하면 정적 파일이 우선 서빙됨 (Cloud Function 무시).
> 반드시 `public/sitemap.xml`은 삭제된 상태로 유지할 것.

### 새 제품 등록 시 흐름
1. 관리자 → AI 페이지 생성에서 제품 등록
2. Firestore `settings/productSettings.products[productId]` 자동 저장
3. 다음 번 구글 크롤링 시 사이트맵에서 자동 감지 → 색인 생성

### Google Search Console 등록 (최초 1회만)
1. Search Console 접속 → 좌측 **Sitemaps** 메뉴
2. 입력창에 `sitemap.xml` 입력 후 제출
3. 이후 구글이 주기적으로 자동 크롤링 (재등록 불필요)

---

## 2. 페이지별 SEO 태그 자동화

### 태그 종류 설명

| 태그 | 역할 |
|------|------|
| `<title>` | 검색결과 제목 |
| `<meta name="description">` | 검색결과 설명 |
| `<meta property="og:title">` | SNS 공유 시 제목 |
| `<meta property="og:description">` | SNS 공유 시 설명 |
| `<meta property="og:url">` | SNS 공유 시 URL |
| `<link rel="canonical">` | 중복 페이지 방지 (대표 URL 지정) |

> **canonical 태그가 없으면** Google이 http/https, www/non-www 등 중복 URL을 각각 다른 페이지로 인식해 색인 품질 저하.

---

### 정적 페이지 (수동 설정 완료)

모든 페이지에 `react-helmet-async`의 `<Helmet>` 컴포넌트로 태그 설정.

| 페이지 | 파일 | Canonical URL |
|--------|------|---------------|
| 홈 | `src/homepage/components/Homepage.js` | `https://www.yespos.co.kr/` |
| 제품 목록 | `src/homepage/pages/Products.js` | `https://www.yespos.co.kr/products` |
| 테이블오더 | `src/homepage/pages/TableOrderDetail.js` | `https://www.yespos.co.kr/products/table-order` |
| POS | `src/homepage/pages/PosDetail.js` | `https://www.yespos.co.kr/products/pos` |
| 키오스크 | `src/homepage/pages/KioskDetail.js` | `https://www.yespos.co.kr/products/kiosk` |
| 카드단말기 | `src/homepage/pages/CardTerminalDetail.js` | `https://www.yespos.co.kr/products/card-terminal` |
| QR오더 | `src/homepage/pages/QrOrderDetail.js` | `https://www.yespos.co.kr/products/qr-order` |
| CCTV | `src/homepage/pages/CCTVDetail.js` | `https://www.yespos.co.kr/products/cctv` |
| 웨이팅시스템 | `src/homepage/pages/WaitingSystemDetail.js` | `https://www.yespos.co.kr/products/waiting-system` |
| 네이버커넥트 | `src/homepage/pages/NaverConnectLanding.jsx` | `https://www.yespos.co.kr/naver-connect` |
| 개인정보처리방침 | `src/homepage/pages/PrivacyPolicy.js` | `https://www.yespos.co.kr/privacy-policy` |

#### 정적 페이지 태그 예시 (PosDetail.js)
```jsx
import { Helmet } from 'react-helmet-async';

<Helmet>
  <title>POS 시스템 - 강력하고 직관적인 포스 솔루션 | 예스텍</title>
  <meta name="description" content="예스텍 POS 시스템으로 매출 관리부터 재고까지 한 번에 관리하세요." />
  <meta property="og:title" content="POS 시스템 | 예스텍" />
  <meta property="og:description" content="예스텍 POS 시스템으로 매출 관리부터 재고까지 한 번에 관리하세요." />
  <meta property="og:url" content="https://www.yespos.co.kr/products/pos" />
  <link rel="canonical" href="https://www.yespos.co.kr/products/pos" />
</Helmet>
```

---

### AI 생성 동적 페이지 (자동 처리)

`/products/:productId` 경로로 접속하면 `DynamicPageLoader.js`가 자동으로 메타 태그 생성.

**파일**: `src/homepage/components/DynamicPageLoader.js`

```jsx
// 제품 데이터 로드 후 자동 생성되는 태그들
const productTitle = `${pageData.name}${pageData.category ? ` - ${pageData.category}` : ''} | 예스텍`;
const productDescription = pageData.description
  ? pageData.description.substring(0, 150)
  : `${pageData.name} 제품 상세 정보. 스마트 결제 솔루션 전문 예스텍에서 제공합니다.`;
const productUrl = `https://www.yespos.co.kr/products/${productId}`;

<Helmet>
  <title>{productTitle}</title>
  <meta name="description" content={productDescription} />
  <meta property="og:title" content={productTitle} />
  <meta property="og:description" content={productDescription} />
  <meta property="og:url" content={productUrl} />
  <link rel="canonical" href={productUrl} />
</Helmet>
```

→ **제품 등록 시 자동 생성**되므로 별도 작업 불필요.

---

## 3. 기타 해결된 이슈

### 리다이렉트 페이지 (301 설정)
`/main` → `/` 301 리다이렉트 추가 (`firebase.json`)

```json
"redirects": [
  { "source": "/main", "destination": "/", "type": 301 }
]
```

### robots.txt 오류 해결
**원인**: Cloudflare가 `Content-Signal: search=yes,ai-train=no` 지시문을 robots.txt 앞에 자동 삽입
**해결**: Cloudflare 대시보드 → **robots.txt 구성 사용 중지** 설정

현재 올바른 `public/robots.txt`:
```
User-agent: *
Disallow: /admin/
Disallow: /admin

Sitemap: https://www.yespos.co.kr/sitemap.xml
```

### AI 페이지 생성기 버그 수정
`AIPageGenerator.js`에서 `saveResult.success = false`가 항상 false로 고정되어
제품 생성 시 Firestore 저장이 전혀 안 되던 버그 수정 (2026-02-19).

---

## 4. 새 정적 페이지 추가 시 체크리스트

새로운 정적 페이지를 만들 때 반드시 아래를 포함:

```jsx
import { Helmet } from 'react-helmet-async';

// return 안에:
<Helmet>
  <title>페이지명 | 예스텍</title>
  <meta name="description" content="페이지 설명 (150자 이내 권장)" />
  <meta property="og:title" content="페이지명 | 예스텍" />
  <meta property="og:description" content="페이지 설명" />
  <meta property="og:url" content="https://www.yespos.co.kr/페이지경로" />
  <link rel="canonical" href="https://www.yespos.co.kr/페이지경로" />
</Helmet>
```

그리고 `functions/index.js`의 `STATIC_PAGES` 배열에 URL 추가:
```javascript
const STATIC_PAGES = [
  // ...기존 페이지들...
  { url: '/새페이지경로', changefreq: 'weekly', priority: '0.7' },
];
```

---

## 5. 배포 명령어

```bash
npm run build                        # React 빌드
firebase deploy                      # 전체 배포 (hosting + functions)
firebase deploy --only functions     # Cloud Function만 배포
firebase deploy --only hosting       # 호스팅만 배포
```
