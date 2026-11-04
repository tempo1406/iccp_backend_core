# Task Worklog Assignee/Subtask FE Guide

Cap nhat: 2026-04-24

Tai lieu nay mo ta rule moi cho FE khi tao/cap nhat worklog tren task va subtask.

## 1. Ket luan ngan

- Moi task/subtask van chi co mot `assignedTo`.
- User chi duoc log work tren task/subtask ma minh la `assignedTo`.
- User co quyen `projects.tasks.log_time` co the log ho, nhung `userId` trong payload van phai la `assignedTo` cua task/subtask do.
- Neu mot task cha co subtask duoc giao cho nguoi khac, nguoi do phai log work tren subtask cua minh, khong log truc tiep len task cha.
- `actualLoggedMinutes` cua task cha se bao gom worklog truc tiep tren task cha va thoi gian roll-up tu cac subtask con.

## 2. Endpoint bi anh huong

Base path:

```txt
/api/v1/projects/:projectId/tasks/:taskId/worklogs
```

Endpoints:

- `POST /projects/:projectId/tasks/:taskId/worklogs`
- `GET /projects/:projectId/tasks/:taskId/worklogs`
- `PUT /projects/:projectId/tasks/:taskId/worklogs/:worklogId`
- `DELETE /projects/:projectId/tasks/:taskId/worklogs/:worklogId`

`taskId` co the la id cua task cha hoac subtask.

## 3. Rule render nut log work

FE nen hien nut `Log work` khi:

- `task.assignedTo === currentUserId`

FE khong nen hien nut `Log work` tren task cha chi vi user duoc assign vao mot subtask ben duoi task cha.

Vi du:

- Task cha `A` assigned cho `PM`.
- Subtask `A-1` assigned cho `Dev`.
- `Dev` chi log work tren `A-1`.
- `PM` co the log work truc tiep tren `A`.
- Man hinh task cha `A` van co the hien tong `actualLoggedMinutes`, bao gom ca thoi gian cua `A-1`.

## 4. Payload tao worklog

Log cho chinh minh:

```json
{
  "workDate": "2026-04-24",
  "durationMinutes": 90,
  "description": "Implemented API validation"
}
```

Log ho assignee khac, chi danh cho user co quyen `projects.tasks.log_time`:

```json
{
  "workDate": "2026-04-24",
  "durationMinutes": 90,
  "description": "Implemented API validation",
  "userId": "assignee-user-id"
}
```

Backend se tu choi neu `userId` khong phai `assignedTo` cua task/subtask dang duoc log.

## 5. Loi FE nen xu ly

Khi user khong phai assignee cua task/subtask:

```txt
403 Only the assigned member can log work on this task or subtask
```

Khi actor log ho nguoi khac nhung thieu quyen:

```txt
403 Missing permission: projects.tasks.log_time
```

Khi `userId` khong phai active member trong project:

```txt
400 Worklog user must be an active member of the project
```

## 6. Hien thi actual time

`TaskResponse.actualLoggedMinutes` co y nghia:

- Voi subtask: tong worklog truc tiep tren subtask va subtask con neu co.
- Voi task cha: tong worklog truc tiep tren task cha va toan bo worklog roll-up tu cac subtask con.

FE nen dung `actualLoggedMinutes` trong task response de hien tong effort tren card/detail task.

Khi can hien danh sach worklog chi tiet:

- Goi `GET /projects/:projectId/tasks/:taskId/worklogs` cho task/subtask dang xem.
- Endpoint nay tra ve worklog truc tiep cua task/subtask do.
- Neu FE can hien ca worklog cua subtask trong man hinh task cha, FE can goi them danh sach subtask va worklog cua tung subtask, hoac doi backend bo sung endpoint aggregate rieng.

## 7. Luong refresh de FE cap nhat dung

Sau khi tao, cap nhat, hoac xoa worklog:

- Refresh worklog list cua task/subtask hien tai.
- Refresh task/subtask detail de lay `actualLoggedMinutes` moi.
- Neu task hien tai la subtask, refresh task cha neu dang hien tong effort cua task cha tren UI.
