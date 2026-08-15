/**
 * 帳票プレビューDOMからPDF Blobを生成する共通処理。
 * ダウンロード（DocShareButtons）とサーバー保存（pdf-asset-service）の両方から使う。
 */
export async function generatePdfBlob(source: HTMLElement, fileName: string): Promise<Blob> {
  // html2pdf.js は ESM 対応のため動的インポート
  const html2pdf = (await import('html2pdf.js')).default
  const element = source.cloneNode(true) as HTMLElement
  // ページ区切りの破線を印刷時は非表示にするためスタイル調整
  element.querySelectorAll<HTMLElement>('.page').forEach((el, i) => {
    if (i > 0) {
      el.style.borderTop = 'none'
      el.style.marginTop = '0'
    }
  })
  const opt = {
    margin: [22, 20, 22, 20] as [number, number, number, number],  // mm: top, left, bottom, right
    filename: `${fileName}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  }
  return html2pdf().set(opt).from(element).outputPdf('blob')
}
