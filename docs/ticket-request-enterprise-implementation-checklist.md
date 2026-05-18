# Ticket Request Enterprise Workflow - Implementation Checklist

Checklist nay dung de doi chieu implementation backend voi docs moi:
- `docs/ticket-request-enterprise-flow.md`
- `docs/ticket-request-flow.md` (enterprise v3)

## 1) Data model va migration

- [x] Them `workflow_code` vao `tenant.ticket_requests`.
- [x] Them `current_step_code`, `current_step_order`.
- [x] Them `effort_owner_id`.
- [x] Them `request_type_name`, `reason_code`, `reason_detail`.
- [x] Backfill du lieu ticket cu theo status/type.
- [x] Them index `(organization_id, workflow_code, current_step_code)`.
- [x] Them FK `effort_owner_id -> auth.users` (neu table ton tai).

## 2) Contract DTO/API

- [x] Create DTO co `workflowCode`.
- [x] Create DTO co `requestTypeName/reasonCode/reasonDetail`.
- [x] Create DTO ho tro `effortOwnerId`.
- [x] Update DTO ho tro `nextApproverId` khi submit lai.
- [x] Approve DTO ho tro `nextApproverId`.
- [x] Reject/RequestChanges DTO ho tro `nextApproverId`.
- [x] List DTO ho tro filter `workflowCode/currentStepCode`.
- [x] Response DTO tra ve `workflowCode/currentStepCode/currentStepOrder`.

## 3) Workflow engine trong service

- [x] Co workflow map cho `working_time`.
- [x] Co workflow map cho `overtime_opic`.
- [x] Co workflow map cho `overtime_standard`.
- [x] Create ticket auto vao approve step dau tien.
- [x] Approve chuyen step theo workflow.
- [x] Approve gate cuoi -> status `approved`.
- [x] Reject co 2 mode: terminal va send-back.
- [x] Request changes force ve submit-step.
- [x] Update ticket chi hop le khi dang o submit-step + `changes_requested`.
- [x] Cancel ticket dat step `canceled`.

## 4) Authorization va visibility

- [x] View scope bo sung `effortOwner`.
- [x] List my bo sung ticket cua `effortOwner`.
- [x] Process step van yeu cau assigned approver hoac org manager.
- [x] Submit step chi actor submit-step duoc submit lai.
- [x] Manage CC cho requester/approver/effortOwner/permission.

## 5) Activity log va notification

- [x] Activity payload co `fromStepCode/toStepCode`.
- [x] Log create + submitted khi tao moi.
- [x] Log submit khi resubmit submit-step.
- [x] Log approve/reject/request-changes theo transition moi.
- [x] Notification den approver/submitter/watchers theo step.

## 6) Controller va docs endpoint

- [x] Controller description cap nhat semantics workflow-step.
- [x] `POST /approve` mo ta `nextApproverId`.
- [x] `POST /reject` mo ta reject-route.
- [x] `PATCH /:ticketId` mo ta submit-step resubmit.
- [x] Docs API `docs/ticket-request-flow.md` cap nhat theo flow enterprise.

## 7) Unit tests

- [x] Controller spec con pass voi contract service moi.
- [x] Service spec cap nhat mock member validation moi.
- [ ] Them test case cho reject send-back phase 1/phase 2.
- [ ] Them test case cho approve transition qua submit-step.
- [ ] Them test case verify `nextApproverId` cho workflow gate tiep theo.

## 8) Open gap can follow-up

- [ ] Chot ro actor mapping OPIC/BUL theo tung tenant config runtime.
- [ ] Bo sung API config workflow theo organization thay vi hard-code.
- [ ] FE dong bo state renderer theo `workflowCode/currentStepCode`.
- [ ] QA e2e cho 3 flow day du tren du lieu thuc te.

