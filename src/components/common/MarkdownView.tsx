import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * @relatedFR FR-LEGAL-06
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description AI 레포트 등 markdown 본문을 렌더링한다(GFM 표/체크리스트 지원).
 *     기존에는 <pre> 원문 노출이라 가독성이 떨어졌다.
 */
export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
