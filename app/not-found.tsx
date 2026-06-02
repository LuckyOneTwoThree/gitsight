import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">页面未找到</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          你访问的页面不存在或已被移除。
        </p>
      </div>
      <Button asChild>
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  )
}
