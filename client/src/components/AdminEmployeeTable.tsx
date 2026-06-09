import { Box, Button } from "./uiParts";

import { useState, type ReactElement } from "react";

import { useAdminEmployees } from "../api/admin.js";
import { AddEmployeeDialog } from "./AddEmployeeDialog.js";
import { EmployeeTable } from "./EmployeeTable.js";

/**
 * 管理画面のユーザー一覧タブ用コンポーネント（#217）。
 * DB から isBot=true の全 Employee を取得して EmployeeTable に渡す。
 * 「社員を追加」ボタンをヘッダに配置し、AddEmployeeDialog を開く。
 */
export const AdminEmployeeTable = (): ReactElement => {
  const { data: employees = [], isLoading } = useAdminEmployees();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => setDialogOpen(true)}
          aria-label="社員を追加"
        >
          社員を追加
        </Button>
      </Box>
      <EmployeeTable employees={employees} isLoading={isLoading} />
      <AddEmployeeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  );
};
