import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generatePdf(
  dashboardElement: HTMLElement,
  email?: string
): Promise<void> {
  const sections = Array.from(
    dashboardElement.querySelectorAll("[data-pdf-section]")
  ) as HTMLElement[];

  if (sections.length === 0) {
    // Fallback: treat entire dashboard as one section
    sections.push(dashboardElement);
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const MARGIN = 10;
  const A4_WIDTH = 210;
  const A4_HEIGHT = 297;
  const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
  const SECTION_GAP = 4;
  let currentY = MARGIN;

  // Add title header on first page
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("EV vs Gasoline Cost Report", A4_WIDTH / 2, currentY + 8, { align: "center" });
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(136, 136, 136);
  const subtitle = `Generated on ${new Date().toLocaleDateString("de-DE")}${email ? ` • ${email}` : ""}`;
  pdf.text(subtitle, A4_WIDTH / 2, currentY + 14, { align: "center" });
  pdf.setTextColor(0, 0, 0);
  currentY += 20;

  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 1000,
    });

    const widthPx = canvas.width / 2;
    const heightPx = canvas.height / 2;
    const scaleFactor = CONTENT_WIDTH / widthPx;
    const heightMM = heightPx * scaleFactor;

    const remainingSpace = A4_HEIGHT - MARGIN - currentY;

    // If section doesn't fit and we're not at the top of a page, start new page
    if (heightMM > remainingSpace && currentY > MARGIN + 20) {
      pdf.addPage();
      currentY = MARGIN;
    }

    // If section is taller than a full page, slice it across pages
    if (heightMM > A4_HEIGHT - MARGIN * 2) {
      const pageContentHeight = A4_HEIGHT - MARGIN * 2;
      const pageCanvasHeight = pageContentHeight / scaleFactor * 2; // in canvas px (scale:2)
      let yOffset = 0;

      while (yOffset < canvas.height) {
        if (currentY > MARGIN && yOffset > 0) {
          pdf.addPage();
          currentY = MARGIN;
        }

        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - yOffset);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        const sliceHeightMM = (sliceHeight / 2) * scaleFactor;
        pdf.addImage(imgData, "JPEG", MARGIN, currentY, CONTENT_WIDTH, sliceHeightMM);
        currentY += sliceHeightMM + SECTION_GAP;
        yOffset += pageCanvasHeight;
      }
    } else {
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", MARGIN, currentY, CONTENT_WIDTH, heightMM);
      currentY += heightMM + SECTION_GAP;
    }
  }

  // Footer on last page
  pdf.setFontSize(8);
  pdf.setTextColor(170, 170, 170);
  pdf.text(
    "EV vs Gasoline Cost Calculator • Calculations are estimates",
    A4_WIDTH / 2,
    A4_HEIGHT - 5,
    { align: "center" }
  );

  pdf.save("ev-vs-gas-cost-report.pdf");
}
