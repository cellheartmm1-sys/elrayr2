import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer
} from "docx";

interface TechItem {
  id: string;
  title: string;
  specs: string;
  quantity: string | number;
  unit: string;
  warranty: string;
}

interface FinItem {
  id: string;
  description: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

interface ProposalPayload {
  proposal_code?: string;
  title: string;
  client_name: string;
  scope_text: string;
  terms_text: string;
  technical_items: TechItem[];
  financial_items: FinItem[];
  vat_percentage: number;
}

function createRtlParagraph(options?: Record<string, unknown>) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { before: 120, after: 120, line: 360 },
    ...options
  });
}

function createText(text: string, options?: Record<string, unknown>) {
  return new TextRun({
    text: text,
    font: "Arial",
    size: 24, // 12pt
    ...options
  });
}

function createCell(contentParagraphs: Paragraph[], options?: Record<string, unknown>) {
  return new TableCell({
    children: contentParagraphs,
    margins: { top: 120, bottom: 120, left: 150, right: 150 },
    ...options
  });
}

function createHeaderCell(text: string, options?: Record<string, unknown>) {
  return createCell([
    createRtlParagraph({
      alignment: AlignmentType.CENTER,
      children: [createText(text, { bold: true, color: "FFFFFF", size: 22 })]
    })
  ], {
    shading: { fill: "1E293B" }, // Tailwind slate-800
    ...options
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload: ProposalPayload = await req.json();

    const scopeParagraphs = (payload.scope_text || "")
      .split("\n")
      .map((line) => createRtlParagraph({ children: [createText(line)] }));

    const termsParagraphs = (payload.terms_text || "")
      .split("\n")
      .map((line) => createRtlParagraph({ children: [createText(line)] }));

    // Technical Table rows
    const techRows = [
      new TableRow({
        children: [
          createHeaderCell("الضمان والدعم", { width: { size: 20, type: WidthType.PERCENTAGE } }),
          createHeaderCell("الكمية / الوحدة", { width: { size: 15, type: WidthType.PERCENTAGE } }),
          createHeaderCell("المواصفات الفنية والتكنولوجية", { width: { size: 45, type: WidthType.PERCENTAGE } }),
          createHeaderCell("الموديول / النظام الفرعي", { width: { size: 20, type: WidthType.PERCENTAGE } })
        ]
      }),
      ...(payload.technical_items || []).map((item) => (
        new TableRow({
          children: [
            createCell([createRtlParagraph({ children: [createText(String(item.warranty || ''))] })]),
            createCell([createRtlParagraph({ alignment: AlignmentType.CENTER, children: [createText(`${item.quantity} ${item.unit}`)] })]),
            createCell([createRtlParagraph({ children: [createText(String(item.specs || ''))] })]),
            createCell([createRtlParagraph({ children: [createText(String(item.title || ''), { bold: true })] })])
          ]
        })
      ))
    ];

    // Financial Table calculations
    const subtotal = (payload.financial_items || []).reduce((acc, item) => acc + (Number(item.totalPrice) || 0), 0);
    const vatPercentage = Number(payload.vat_percentage || 0);
    const vatAmount = subtotal * (vatPercentage / 100);
    const grandTotal = subtotal + vatAmount;

    // Financial Table rows
    const finRows = [
      new TableRow({
        children: [
          createHeaderCell("السعر الإجمالي (ج.م)", { width: { size: 20, type: WidthType.PERCENTAGE } }),
          createHeaderCell("سعر الوحدة (ج.م)", { width: { size: 20, type: WidthType.PERCENTAGE } }),
          createHeaderCell("الكمية", { width: { size: 10, type: WidthType.PERCENTAGE } }),
          createHeaderCell("الفئة / التصنيف", { width: { size: 20, type: WidthType.PERCENTAGE } }),
          createHeaderCell("بند الأعمال وتوصيف الخدمة", { width: { size: 30, type: WidthType.PERCENTAGE } })
        ]
      }),
      ...(payload.financial_items || []).map((item) => (
        new TableRow({
          children: [
            createCell([createRtlParagraph({ alignment: AlignmentType.LEFT, children: [createText(Number(item.totalPrice || 0).toLocaleString())] })]),
            createCell([createRtlParagraph({ alignment: AlignmentType.LEFT, children: [createText(Number(item.unitPrice || 0).toLocaleString())] })]),
            createCell([createRtlParagraph({ alignment: AlignmentType.CENTER, children: [createText(String(item.quantity || 1))] })]),
            createCell([createRtlParagraph({ children: [createText(String(item.category || ''))] })]),
            createCell([createRtlParagraph({ children: [createText(String(item.description || ''), { bold: true })] })])
          ]
        })
      )),
      // Subtotal
      new TableRow({
        children: [
          createCell([createRtlParagraph({ alignment: AlignmentType.LEFT, children: [createText(`${subtotal.toLocaleString()} ج.م`, { bold: true })] })], { shading: { fill: "F8FAFC" } }),
          createCell([createRtlParagraph({ children: [createText("-")] })], { shading: { fill: "F8FAFC" } }),
          createCell([createRtlParagraph({ children: [createText("-")] })], { shading: { fill: "F8FAFC" } }),
          createCell([createRtlParagraph({ children: [createText("-")] })], { shading: { fill: "F8FAFC" } }),
          createCell([createRtlParagraph({ children: [createText("الإجمالي الفرعي (قبل الضريبة)", { bold: true })] })], { shading: { fill: "F8FAFC" } })
        ]
      })
    ];

    // VAT if applicable
    if (vatPercentage > 0) {
      finRows.push(
        new TableRow({
          children: [
            createCell([createRtlParagraph({ alignment: AlignmentType.LEFT, children: [createText(`${vatAmount.toLocaleString()} ج.م`)] })], { shading: { fill: "F8FAFC" } }),
            createCell([createRtlParagraph({ children: [createText("-")] })], { shading: { fill: "F8FAFC" } }),
            createCell([createRtlParagraph({ children: [createText("-")] })], { shading: { fill: "F8FAFC" } }),
            createCell([createRtlParagraph({ children: [createText("-")] })], { shading: { fill: "F8FAFC" } }),
            createCell([createRtlParagraph({ children: [createText(`ضريبة القيمة المضافة (${vatPercentage}%)`, { bold: true })] })], { shading: { fill: "F8FAFC" } })
          ]
        })
      );
    }

    // Grand Total
    finRows.push(
      new TableRow({
        children: [
          createCell([createRtlParagraph({ alignment: AlignmentType.LEFT, children: [createText(`${grandTotal.toLocaleString()} ج.م`, { bold: true, color: "C59B27" })] })], { shading: { fill: "F8FAFC" } }),
          createCell([createRtlParagraph({ children: [createText("-")] })], { shading: { fill: "F8FAFC" } }),
          createCell([createRtlParagraph({ children: [createText("-")] })], { shading: { fill: "F8FAFC" } }),
          createCell([createRtlParagraph({ children: [createText("-")] })], { shading: { fill: "F8FAFC" } }),
          createCell([createRtlParagraph({ children: [createText("الإجمالي الكلي النهائي", { bold: true })] })], { shading: { fill: "F8FAFC" } })
        ]
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    createText("مؤسسة الرايق للمقاولات الكهروميكانيكية", { bold: true, size: 18, color: "94A3B8" })
                  ]
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  bidirectional: true,
                  children: [
                    createText("العرض الفني والمالي - مؤسسة الرايق للمقاولات", { size: 16, color: "94A3B8" })
                  ]
                })
              ]
            })
          },
          children: [
            // Title Block
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { after: 300 },
              children: [
                createText(payload.title || "العرض الفني والمالي لتطوير المنظومة", {
                  bold: true,
                  size: 32,
                  color: "1E293B"
                })
              ]
            }),

            // Info Box Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" }
              },
              rows: [
                new TableRow({
                  children: [
                    createCell([createRtlParagraph({ children: [createText(payload.client_name || "", { bold: true })] })], { width: { size: 70, type: WidthType.PERCENTAGE } }),
                    createCell([createRtlParagraph({ children: [createText("العميل المستهدف:", { bold: true, color: "475569" })] })], { width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" } })
                  ]
                }),
                new TableRow({
                  children: [
                    createCell([createRtlParagraph({ children: [createText(payload.proposal_code || "N/A")] })], { width: { size: 70, type: WidthType.PERCENTAGE } }),
                    createCell([createRtlParagraph({ children: [createText("رقم العرض:", { bold: true, color: "475569" })] })], { width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" } })
                  ]
                }),
                new TableRow({
                  children: [
                    createCell([createRtlParagraph({ children: [createText(new Date().toLocaleDateString('ar-EG'))] })], { width: { size: 70, type: WidthType.PERCENTAGE } }),
                    createCell([createRtlParagraph({ children: [createText("تاريخ الإصدار:", { bold: true, color: "475569" })] })], { width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: "F8FAFC" } })
                  ]
                })
              ]
            }),

            new Paragraph({ spacing: { before: 300, after: 100 } }),

            // Scope of Work
            createRtlParagraph({
              children: [createText("1. مقدمة ونطاق العمل العام", { bold: true, size: 26, color: "C59B27" })]
            }),
            ...scopeParagraphs,

            new Paragraph({ spacing: { before: 200, after: 100 } }),

            // Technical Specs Title
            createRtlParagraph({
              children: [createText("2. العرض الفني ومواصفات الموديولات والأنظمة", { bold: true, size: 26, color: "C59B27" })]
            }),

            // Technical Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "1E293B" },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E293B" },
                left: { style: BorderStyle.SINGLE, size: 6, color: "1E293B" },
                right: { style: BorderStyle.SINGLE, size: 6, color: "1E293B" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" }
              },
              rows: techRows
            }),

            new Paragraph({ spacing: { before: 300, after: 100 } }),

            // Financial Specs Title
            createRtlParagraph({
              children: [createText("3. العرض المالي وتوزيع التكاليف", { bold: true, size: 26, color: "C59B27" })]
            }),

            // Financial Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "1E293B" },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E293B" },
                left: { style: BorderStyle.SINGLE, size: 6, color: "1E293B" },
                right: { style: BorderStyle.SINGLE, size: 6, color: "1E293B" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" }
              },
              rows: finRows
            }),

            new Paragraph({ spacing: { before: 300, after: 100 } }),

            // Terms and Conditions Title
            createRtlParagraph({
              children: [createText("4. الشروط العامة والأحكام المالية", { bold: true, size: 26, color: "C59B27" })]
            }),
            ...termsParagraphs,

            new Paragraph({ spacing: { before: 400, after: 100 } }),

            // Signature section
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE }
              },
              rows: [
                new TableRow({
                  children: [
                    createCell([
                      createRtlParagraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          createText("مقدم الخدمة (المطور المسؤول)", { bold: true, color: "1E293B" }),
                          createText("\nالتوقيع: ____________________\nالتاريخ: ____ / ____ / ________")
                        ]
                      })
                    ], { width: { size: 50, type: WidthType.PERCENTAGE } }),
                    createCell([
                      createRtlParagraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          createText("العميل (مؤسسة الرايق للمقاولات)", { bold: true, color: "1E293B" }),
                          createText("\nالتوقيع: ____________________\nالتاريخ: ____ / ____ / ________")
                        ]
                      })
                    ], { width: { size: 50, type: WidthType.PERCENTAGE } })
                  ]
                })
              ]
            })
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="proposal.docx"`
      }
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
