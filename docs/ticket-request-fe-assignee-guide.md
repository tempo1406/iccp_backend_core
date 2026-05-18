# Ticket Request FE Assignee Guide

Cap nhat: 2026-04-09

Tai lieu nay mo ta rule moi de FE render dung cac nut workflow (`approve`, `reject`, `request changes`, `submit lai`) sau khi backend da chuyen sang co che assignee ro rang.

## 1. Ket luan ngan

- API process workflow van dung permission route `ticket_requests.delegate`.
- Tuy nhien, backend hien tai chi cho phep **assigned delegate hien tai** process ticket.
- FE khong duoc render nut process chi dua vao manager role hay `list_org`.
- FE phai dua vao `ticket.delegate` trong response.
- Backend da tu dong gan **mot org admin cu the** khi ticket di vao cac step org-admin.

## 2. Field FE phai tin dung

Trong `TicketRequestSummaryResponse` va `TicketRequestDetailResponse`, backend tra ve:

- `status`
- `workflowCode`
- `currentStepCode`
- `delegate`
- `requester`
- `effortOwner`

Rule thuc te:

- `delegate` la source of truth de FE xac dinh actor hien tai co duoc thao tac workflow hay khong.
- FE dung `delegate.id` de so sanh actor hien tai.

## 3. Rule hien thi nut approve/reject/request-changes

Chi hien thi cac nut nay khi thoa dong thoi:

- `status === "pending_approval"`
- `currentUserId === ticket.delegate?.id`

Khong duoc hien thi chi vi:

- user la org admin
- user co `ticket_requests.list_org`
- user dang o man manage tickets

Ly do:

- Backend da chan process neu actor khong phai assignee hien tai.
- `list_org` chi la quyen xem/list, khong phai dieu kien de FE mo nut process.

## 4. Rule hien thi nut submit/update

FE van render nut submit/update dua vao submitter cua tung step:

- `emp_create_request` -> submitter = `requester.id`
- `pm_create_request` -> submitter = `requester.id`
- `project_member_declare_ot` -> submitter = `effortOwner.id`, fallback `requester.id`

Chi hien thi nut submit/update khi:

- ticket dang o submit-step
- va current user dung submitter cua step do

## 5. Backend auto assign org admin khi nao

Khi ticket chuyen vao cac step sau, backend se tu dong gan `delegate` bang **mot org admin cu the**:

- `org_approve`
- `org_confirm`
- `org_approve_pre`
- `org_approve_post`

Y nghia cho FE:

- Sau moi lan approve/reject/request-changes/update ma ticket co the doi assignee, FE phai refresh detail/list.
- Sau khi refresh, FE co the so sanh `currentUserId` voi `ticket.delegate.id` de biet con duoc thao tac hay khong.
- Neu step vua chuyen sang org-admin step va backend da assign sang nguoi khac, nut process phai bien mat.

## 6. Rule assignee o OT flow

Trong OT flow, khi ticket di vao submit-step `project_member_declare_ot`:

- submitter la `effortOwner`

Khi tu `project_member_declare_ot` submit sang `pm_confirm`:

- backend mac dinh stage assignee tiep theo la `requester`
- neu backend/nguoi dung co truyen `nextDelegateId` hop le thi backend co the dung gia tri do

Y nghia cho FE:

- Sau khi effort owner submit, phai refresh ticket.
- Khong duoc giu trang thai nut process cu tren FE.

## 7. FE action matrix de dung ngay

### 7.1 Approve / Reject / Request changes

Show khi:

- `ticket.status === "pending_approval"`
- `currentUserId === ticket.delegate?.id`

Hide trong moi truong hop con lai.

### 7.2 Update / Resubmit

Show khi:

- `ticket.status === "changes_requested"`
- va submitter cua `currentStepCode` la current user

### 7.3 Declare OT effort

Show khi:

- `ticket.currentStepCode === "project_member_declare_ot"`
- `currentUserId === ticket.effortOwner?.id || currentUserId === ticket.requester.id`
- va status hop le theo contract backend hien tai

## 8. FE pseudocode khuyen nghi

```ts
const currentAssigneeId = ticket.delegate?.id ?? null;

const canProcessApproveStep =
  ticket.status === 'pending_approval' &&
  currentUserId === currentAssigneeId;

const submitterId =
  ticket.currentStepCode === 'emp_create_request'
    ? ticket.requester.id
    : ticket.currentStepCode === 'pm_create_request'
      ? ticket.requester.id
      : ticket.currentStepCode === 'project_member_declare_ot'
        ? (ticket.effortOwner?.id ?? ticket.requester.id)
        : null;

const canSubmitStep =
  submitterId !== null &&
  currentUserId === submitterId &&
  (
    ticket.status === 'changes_requested' ||
    ticket.status === 'pending_submission'
  );
```

## 9. FE checklist khi sua man

- Dung `delegate.id` lam source of truth cho nut process.
- Luon refresh ticket detail sau `approve`, `reject`, `request-changes`, `update`, `declare-ot-effort`.
- Neu list screen co action nhanh, sau action cung phai refetch item/list.
- Khong cache local `canApprove` qua lau; phai tinh lai tu data moi nhat.
- Khong dung role org admin hay permission `list_org` de mo nut workflow.

## 10. Contract team can thong nhat

Cau mo ta ngan de dong bo FE/BE:

> Workflow action API van yeu cau `ticket_requests.delegate`, nhung actor thuc te phai la `delegate` hien tai cua ticket. Khi ticket vao org-admin step, backend se auto assign mot org admin cu the va tra ve trong field `delegate`.
