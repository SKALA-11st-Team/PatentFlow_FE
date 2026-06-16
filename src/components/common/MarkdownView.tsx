import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

/**
 * 권리범위 참고도 등 base64 인라인 이미지(`data:image/...;base64,`)를 허용한다.
 * react-markdown 기본 urlTransform은 data: 스킴을 안전하지 않다고 보고 src를 비워
 * 도면이 렌더링되지 않으므로, 스크립트 위험이 없는 래스터 이미지 data URI만 통과시킨다
 * (svg+xml은 XSS 위험이 있어 의도적으로 제외).
 */
const ALLOWED_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,/i;

function urlTransform(url: string, key: string): string {
  if (key === "src" && ALLOWED_DATA_IMAGE.test(url)) {
    return url;
  }
  return defaultUrlTransform(url);
}

/**
 * 에이전트는 표 셀이나 본문에 줄바꿈용 <br> 등 인라인 HTML을 박아 보낸다.
 * rehype-raw로 이를 렌더링하되, rehype-sanitize로 <script>·이벤트 핸들러 등
 * 위험 요소는 제거한다. 도면용 data:image(래스터) src는 통과시키되(이후
 * urlTransform이 svg를 차단), 그 외 위험한 data: 본문은 허용하지 않는다.
 */
const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), "data"],
  },
};

/**
 * @relatedFR FR-LEGAL-06
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description AI 레포트 등 markdown 본문을 렌더링한다(GFM 표/체크리스트 + <br> 등 안전한 인라인 HTML 지원).
 *     기존에는 <pre> 원문 노출이라 가독성이 떨어졌고, <br> 태그가 그대로 노출됐다.
 */
export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        remarkPlugins={[remarkGfm]}
        urlTransform={urlTransform}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
