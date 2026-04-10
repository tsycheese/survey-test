"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Users, Copy, Trash2, Plus, Shield, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type User = {
  id: string
  name: string | null
  email: string
  image: string | null
}

type Collaborator = {
  id: string
  userId: string
  canEdit: boolean
  canViewResults: boolean
  createdAt: string
  user: User
}

type Invite = {
  id: string
  code: string
  expiresAt: string | null
  usedCount: number
  permissions: {
    canEdit: boolean
    canViewResults: boolean
  } | null
}

export function CollaborationDialog({ surveyId }: { surveyId: string }) {
  const [open, setOpen] = useState(false)
  const [owner, setOwner] = useState<User | null>(null)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [myPermissions, setMyPermissions] = useState<{
    isOwner: boolean
    canEdit: boolean
    canViewResults: boolean
  } | null>(null)

  // 表单状态
  const [expiresIn, setExpiresIn] = useState<string>("7")
  const [newPermission, setNewPermission] = useState<"view" | "edit">("view")

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  async function loadData() {
    setLoading(true)
    try {
      const [collabRes, invitesRes, sessionRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}/collaborators`),
        fetch(`/api/surveys/${surveyId}/invites`),
        fetch("/api/auth/session"),
      ])

      // 获取协作者数据（只读取一次）
      let collabData = null
      if (collabRes.ok) {
        collabData = await collabRes.json()
        setOwner(collabData.owner)
        setCollaborators(collabData.collaborators)
      }
      if (invitesRes.ok) setInvites(await invitesRes.json())

      // 检查当前用户权限
      const sessionData = await sessionRes.json()
      const userId = sessionData?.user?.id

      if (userId && collabData) {
        const isOwner = collabData.owner?.id === userId
        const myCollab = collabData.collaborators.find(
          (c: Collaborator) => c.userId === userId
        )
        setMyPermissions({
          isOwner,
          canEdit: isOwner || myCollab?.canEdit || false,
          canViewResults: isOwner || myCollab?.canViewResults || false,
        })
      }
    } catch {
      toast.error("加载失败")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvite() {
    // 检查权限：只能授予比自己低的权限
    if (myPermissions) {
      if (newPermission === "edit" && !myPermissions.canEdit) {
        toast.error("您没有权限授予他人编辑权限")
        return
      }
    }

    setIsCreating(true)
    try {
      const res = await fetch(`/api/surveys/${surveyId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresIn: expiresIn === "null" ? null : parseInt(expiresIn),
          permissions: {
            canEdit: newPermission === "edit",
            canViewResults: newPermission === "edit",
          },
        }),
      })

      if (res.ok) {
        const invite = await res.json()
        setInvites([invite, ...invites])
        toast.success("邀请码已创建")
        // 重置表单
        setExpiresIn("7")
        setNewPermission("view")
      } else {
        const err = await res.json()
        toast.error(err.error || "创建失败")
      }
    } catch {
      toast.error("创建失败")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteInvite(inviteId: string) {
    if (!confirm("确定要删除这个邀请码吗？")) return

    const res = await fetch(`/api/surveys/${surveyId}/invites/${inviteId}`, {
      method: "DELETE",
    })

    if (res.ok) {
      setInvites(invites.filter((i) => i.id !== inviteId))
      toast.success("已删除")
    } else {
      toast.error("删除失败")
    }
  }

  async function handleUpdatePermission(userId: string, canEdit: boolean) {
    // 检查权限
    if (myPermissions && canEdit && !myPermissions.canEdit) {
      toast.error("您没有权限授予他人编辑权限")
      return
    }

    const res = await fetch(
      `/api/surveys/${surveyId}/collaborators/${userId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canEdit,
          canViewResults: canEdit, // 可编辑包含可查看结果
        }),
      }
    )

    if (res.ok) {
      setCollaborators(
        collaborators.map((c) =>
          c.userId === userId ? { ...c, canEdit, canViewResults: canEdit } : c
        )
      )
      toast.success("权限已更新")
    } else {
      toast.error("更新失败")
    }
  }

  async function handleRemoveCollaborator(userId: string) {
    if (!confirm("确定要移除这个协作者吗？")) return

    const res = await fetch(
      `/api/surveys/${surveyId}/collaborators/${userId}`,
      {
        method: "DELETE",
      }
    )

    if (res.ok) {
      setCollaborators(collaborators.filter((c) => c.userId !== userId))
      toast.success("已移除")
    } else {
      toast.error("移除失败")
    }
  }

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/invite/${surveyId}/${code}`
    navigator.clipboard.writeText(link)
    toast.success("邀请链接已复制")
  }

  const canManage = myPermissions?.isOwner || myPermissions?.canEdit

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="mr-1.5 h-4 w-4" />
          协作
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>问卷协作</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            加载中...
          </div>
        ) : (
          <div className="space-y-6">
            {/* 创建邀请码 */}
            {canManage && (
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 text-sm font-medium">创建邀请码</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1天</SelectItem>
                        <SelectItem value="7">7天</SelectItem>
                        <SelectItem value="30">30天</SelectItem>
                        <SelectItem value="null">永久</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      权限
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewPermission("view")}
                        className={`flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                          newPermission === "view"
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                        仅查看
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPermission("edit")}
                        disabled={!myPermissions?.canEdit}
                        className={`flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                          newPermission === "edit"
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted"
                        } ${!myPermissions?.canEdit ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        <Shield className="h-4 w-4" />
                        可编辑
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {newPermission === "view"
                        ? "协作者只能查看问卷，不能修改"
                        : "协作者可以编辑问卷和查看统计结果"}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleCreateInvite}
                    disabled={isCreating}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    生成邀请码
                  </Button>
                </div>
              </div>
            )}

            {/* 邀请链接列表 */}
            {invites.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">有效邀请链接</h4>
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                          {invite.code}
                        </code>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {invite.permissions?.canEdit ? "可编辑" : "仅查看"}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => copyInviteLink(invite.code)}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          复制链接
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteInvite(invite.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 问卷拥有者 */}
            {owner && (
              <div>
                <h4 className="mb-2 text-sm font-medium">问卷拥有者</h4>
                <div className="rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs">
                      {owner.name?.[0] || owner.email[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {owner.name || owner.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {owner.email}
                      </div>
                    </div>
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      拥有者
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 协作者列表 */}
            {collaborators.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  协作者 ({collaborators.length})
                </h4>
                <div className="space-y-2">
                  {collaborators.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs">
                          {c.user.name?.[0] || c.user.email[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {c.user.name || c.user.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage ? (
                          <>
                            <Select
                              value={c.canEdit ? "edit" : "view"}
                              onValueChange={(v) =>
                                handleUpdatePermission(c.userId, v === "edit")
                              }
                              disabled={!myPermissions?.canEdit}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="view">仅查看</SelectItem>
                                <SelectItem value="edit">可编辑</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveCollaborator(c.userId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {c.canEdit ? "可编辑" : "仅查看"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {collaborators.length === 0 && invites.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无协作者，创建邀请码邀请他人加入
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
