"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Globe,
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  company: string;
  role: string;
  timezone: string;
  language: string;
}

export function ProfileForm() {
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    company: "",
    role: "",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/auth/profile");
        if (!response.ok) throw new Error("无法加载个人资料");
        const payload = (await response.json()) as { profile: ProfileData };
        if (cancelled) return;
        setProfile(payload.profile);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          company: profile.company,
          role: profile.role,
          timezone: profile.timezone,
          language: profile.language,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "保存失败");
      }
      setMessage("个人资料已保存。");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarFallback className="bg-primary/20 text-primary text-xl">
                  {(profile.name || profile.email)[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h3 className="text-base font-semibold">
                {profile.name || "未设置昵称"}
              </h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <Badge variant="secondary" className="mt-2 text-[10px]">
                桌面版用户
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    显示名称
                  </Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="你的显示名称"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    邮箱地址
                  </Label>
                  <Input
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    公司/组织
                  </Label>
                  <Input
                    value={profile.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder="你的公司或组织（选填）"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    职位角色
                  </Label>
                  <Select
                    value={profile.role}
                    onValueChange={(value) => updateField("role", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="开发者">开发者</SelectItem>
                      <SelectItem value="产品经理">产品经理</SelectItem>
                      <SelectItem value="技术负责人">技术负责人</SelectItem>
                      <SelectItem value="投资人">投资人</SelectItem>
                      <SelectItem value="独立开发者">独立开发者</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    界面语言
                  </Label>
                  <Select
                    value={profile.language}
                    onValueChange={(value) => updateField("language", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="zh-TW">繁體中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    时区
                  </Label>
                  <Select
                    value={profile.timezone}
                    onValueChange={(value) => updateField("timezone", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Shanghai">
                        北京时间 (Asia/Shanghai)
                      </SelectItem>
                      <SelectItem value="Asia/Tokyo">
                        东京时间 (Asia/Tokyo)
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        纽约时间 (America/New_York)
                      </SelectItem>
                      <SelectItem value="Europe/London">
                        伦敦时间 (Europe/London)
                      </SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {message && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {message}
                </div>
              )}
              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {isSaving ? "保存中..." : "保存更改"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
