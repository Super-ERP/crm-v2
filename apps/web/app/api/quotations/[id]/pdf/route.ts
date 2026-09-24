import { getQuotationDocument } from "@/app/(app)/quotations/actions"
import { renderCitrusCloudPdf } from "@/lib/citrus-cloud-pdf"
import { storage } from "@/lib/storage"
import sharp from "sharp"

function safeFilename(value: string): string {
  const filename = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return `${filename || "quotation"}.pdf`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const document = await getQuotationDocument(id)
  if (!document) {
    return Response.json({ error: "Quotation not found" }, { status: 404 })
  }

  try {
    const inline = new URL(request.url).searchParams.get("inline") === "1"
    if (document.quotationTemplate?.code === "citruscloud") {
      let logo: { data: string } | null = null
      if (document.company.logoStorageKey) {
        try {
          const bytes = await storage.get(document.company.logoStorageKey)
          const png = await sharp(bytes).png().toBuffer()
          logo = { data: `data:image/png;base64,${png.toString("base64")}` }
        } catch (error) {
          console.error("[quotation-pdf] logo unavailable", { quotationId: id, error })
        }
      }
      const pdf = await renderCitrusCloudPdf(document, logo)
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeFilename(document.quotation.quoteNumber)}"`,
          "Content-Length": String(pdf.length),
          "Cache-Control": "private, no-store",
        },
      })
    }

    const cookieHeader = request.headers.get("cookie") ?? ""
    const form = new FormData()
    form.set("url", `http://web:3000/quotation-preview/${id}`)
    // Forward the browser session exactly as received. Using Gotenberg's
    // cookie-object form field forces a synthetic `web` cookie domain and can
    // make Chromium reject secure/prefix cookies before loading the preview.
    form.set("extraHttpHeaders", JSON.stringify({ Cookie: cookieHeader }))
    form.set("paperWidth", "8.27")
    form.set("paperHeight", "11.69")
    form.set("marginTop", "0")
    form.set("marginBottom", "0")
    form.set("marginLeft", "0")
    form.set("marginRight", "0")
    form.set("printBackground", "true")
    form.set("preferCssPageSize", "true")
    form.set("failOnHttpStatusCodes", "[400,499,500,599]")

    const response = await fetch(
      `${process.env.GOTENBERG_URL ?? "http://gotenberg:3000"}/forms/chromium/convert/url`,
      { method: "POST", body: form, signal: AbortSignal.timeout(30_000) }
    )
    if (!response.ok) {
      throw new Error(`Gotenberg returned HTTP ${response.status}: ${await response.text()}`)
    }
    const pdf = new Uint8Array(await response.arrayBuffer())
    if (new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") {
      throw new Error("Gotenberg returned a non-PDF response")
    }

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeFilename(document.quotation.quoteNumber)}"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("[quotation-pdf] render failed", { quotationId: id, error })
    const detail = error instanceof Error ? error.message : "Unknown renderer error"
    return Response.json(
      { error: "Quotation PDF rendering failed", detail },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}
