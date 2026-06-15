import type { PatentListItem, PatentUpsertPayload } from "../types/patent";

/**
 * @relatedFR FR-LEGAL-02, FR-LEGAL-03
 * @description F5: 특허 목록 CSV 내보내기/가져오기 — 외부 라이브러리 없이 따옴표 포함 셀을 처리하는
 * 최소 파서를 제공한다. 내보내기는 Excel 한글 호환을 위해 BOM을 붙인다.
 */
// round-trip 보존: parsePatentCsv가 읽는 컬럼 집합과 동일하게 맞춘다. import이 무시하는
// feeDueDate·departmentName은 내보내면 재가져오기 시 손실되므로 제외한다.
const EXPORT_HEADERS = [
  "managementNumber",
  "title",
  "country",
  "applicationDate",
  "registrationDate",
  "applicationNumber",
  "registrationNumber",
  "coApplicants",
  "expectedExpirationDate",
  "businessArea",
  "technologyArea",
  "productName",
] as const;

export function patentsToCsv(patents: PatentListItem[]): string {
  const rows = patents.map((patent) =>
    EXPORT_HEADERS.map((header) => csvCell(String(patent[header] ?? ""))).join(","),
  );
  return "\uFEFF" + [EXPORT_HEADERS.join(","), ...rows].join("\n");
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface CsvImportRow {
  payload: PatentUpsertPayload;
  line: number;
}

export interface CsvImportResult {
  rows: CsvImportRow[];
  errors: string[];
}

/** 헤더 행 기반 매핑 — managementNumber·title 필수, 나머지는 선택. */
export function parsePatentCsv(text: string): CsvImportResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return { rows: [], errors: ["CSV에 헤더와 데이터 행이 필요합니다."] };
  }
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const required = ["managementNumber", "title"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    return { rows: [], errors: [`필수 컬럼 누락: ${missing.join(", ")}`] };
  }

  const rows: CsvImportRow[] = [];
  const errors: string[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index]);
    const record: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      record[header] = (cells[headerIndex] ?? "").trim();
    });
    if (!record.managementNumber || !record.title) {
      errors.push(`${index + 1}행: 관리번호와 특허명은 필수입니다.`);
      continue;
    }
    rows.push({
      line: index + 1,
      payload: {
        managementNumber: record.managementNumber,
        title: record.title,
        country: record.country || "KR",
        applicationDate: record.applicationDate || "",
        registrationDate: record.registrationDate || "",
        applicationNumber: record.applicationNumber || "",
        registrationNumber: record.registrationNumber || null,
        coApplicants: record.coApplicants || "없음",
        expectedExpirationDate: record.expectedExpirationDate || "",
        // PatentBibliographicInfo.source 유니온에 "CSV_IMPORT"가 없어 이 필드만 좁게 단언한다.
        // 객체 전체를 캐스팅하지 않으므로 나머지 필드는 PatentUpsertPayload로 정상 타입 체크된다.
        // (BE PatentUpsertRequest.source는 plain String이라 런타임 통과.)
        source: "CSV_IMPORT" as PatentUpsertPayload["source"],
        businessArea: record.businessArea || "미분류",
        technologyArea: record.technologyArea || "미분류",
        productName: record.productName || "",
      },
    });
  }
  return { rows, errors };
}

/** 따옴표로 감싼 셀("a,b" / 이중따옴표 이스케이프)을 처리하는 단일 행 분리기. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

/** F5: CSV 문자열을 파일로 다운로드한다. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
