import {
  DataTable,
  DataTableBody,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { KeyIcon } from "@phosphor-icons/react";
import { ListState } from "@/components/layout/list-state";
import { ApiKeyRow } from "@/components/settings/api-key-row";
import { PLACEHOLDER_API_KEYS } from "@/lib/settings/settings-placeholders";
import { API_KEYS_TABLE } from "@/lib/settings/settings-tables";

interface ApiKeyListRow {
  readonly createdAt: Date | string;
  readonly id: string;
  readonly name: string | null;
  readonly start: string | null;
}

export function ApiKeyList({
  error,
  loading,
  onRevoke,
  rows,
}: {
  readonly error: Error | null;
  readonly loading: boolean;
  readonly onRevoke: (id: string, name: string) => void;
  readonly rows: readonly ApiKeyListRow[];
}) {
  return (
    <ListState
      description="Create one to use the SDK or the CLI."
      empty={rows.length === 0}
      error={error}
      icon={<KeyIcon />}
      loading={loading}
      title="No keys yet"
    >
      <DataTable columns={API_KEYS_TABLE.columns} label={API_KEYS_TABLE.label}>
        <DataTableHead headings={API_KEYS_TABLE.headings} />
        <DataTableBody>
          {(loading ? PLACEHOLDER_API_KEYS : rows).map((row) => {
            const name = row.name ?? "Unnamed key";

            return (
              <ApiKeyRow
                createdAt={row.createdAt}
                key={row.id}
                name={name}
                onRevoke={() => onRevoke(row.id, name)}
                start={row.start}
              />
            );
          })}
        </DataTableBody>
      </DataTable>
    </ListState>
  );
}
