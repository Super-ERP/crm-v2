import { Card,CardHeader,CardTitle,CardDescription,CardContent } from "@/components/ui/card"

export function LocationCatalogueSettings() {
  return <Card><CardHeader><CardTitle>Countries & States</CardTitle><CardDescription>Shared location directory. City/Town accepts custom text in address forms.</CardDescription></CardHeader>
    <CardContent>
      <p className="text-xs text-muted-foreground">Location data: <a className="underline" href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></p>
    </CardContent></Card>
}
