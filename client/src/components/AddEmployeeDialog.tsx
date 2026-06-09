import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "./uiParts";

import { useForm } from "@tanstack/react-form";
import type { ReactElement } from "react";

import { EMPLOYEE_DISPLAY_NAME_MAX_LENGTH, EMPLOYEE_ROLE_MAX_LENGTH } from "@hatchery/common";
import { useCreateAdminEmployee } from "../api/admin.js";

interface AddEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 管理画面のユーザー一覧タブで AI 社員（isBot=true）を追加するモーダル（#217）。
 * フォームは @tanstack/react-form の useForm を使用（useState によるフォーム管理禁止）。
 */
export const AddEmployeeDialog = ({ open, onClose }: AddEmployeeDialogProps): ReactElement => {
  const createEmployee = useCreateAdminEmployee();

  const form = useForm({
    defaultValues: {
      displayName: "",
      role: "",
    },
    onSubmit: ({ value }) => {
      createEmployee.mutate(
        {
          displayName: value.displayName.trim(),
          role: value.role.trim() || undefined,
        },
        {
          onSuccess: () => {
            form.reset();
            onClose();
          },
        },
      );
    },
  });

  const handleClose = (): void => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>社員を追加</DialogTitle>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <form.Field
            name="displayName"
            validators={{
              onSubmit: ({ value }) => (!value.trim() ? "表示名は必須です" : undefined),
            }}
          >
            {(field) => (
              <TextField
                size="small"
                label="表示名"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                inputProps={{ "aria-label": "表示名", maxLength: EMPLOYEE_DISPLAY_NAME_MAX_LENGTH }}
                error={field.state.meta.errors.length > 0}
                helperText={field.state.meta.errors[0] ?? ""}
                autoFocus
                fullWidth
                required
              />
            )}
          </form.Field>
          <form.Field name="role">
            {(field) => (
              <TextField
                size="small"
                label="役割（任意）"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                inputProps={{ "aria-label": "役割（任意）", maxLength: EMPLOYEE_ROLE_MAX_LENGTH }}
                fullWidth
              />
            )}
          </form.Field>
          {createEmployee.isError && (
            <Typography variant="caption" color="error">
              作成に失敗しました。もう一度お試しください。
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>キャンセル</Button>
          <form.Subscribe selector={(state) => state.values.displayName}>
            {(displayName) => (
              <Button
                type="submit"
                variant="contained"
                disabled={!displayName.trim() || createEmployee.isPending}
              >
                追加
              </Button>
            )}
          </form.Subscribe>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
