import { useState } from "react";
import { AppText } from "@/shared/ui/components/AppText";
import { BottomSheetModal, SheetCloseButton } from "@/shared/ui/components/BottomSheetModal";
import { SettingsRow } from "@/shared/ui/components/SettingsRow";
import { FormField } from "@/shared/ui/components/FormField";
import { Button } from "@/shared/ui/components/Button";
import { tokens } from "@/shared/ui/theme/tokens";
import { useAuthStore } from "@/features/auth/store";
import { updateMe } from "@/shared/api/auth";
import { getApiErrorMessage } from "@/shared/api/errors";

export const DISPLAY_NAME_MAX = 40;

/** The name in Home's "Good afternoon, <name>", saved to the account. */
export function DisplayNameSetting() {
  const displayName = useAuthStore((s) => s.user?.displayName ?? "");
  const setUser = useAuthStore((s) => s.setUser);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = () => {
    setDraft(null);
    setError("");
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      setUser(await updateMe({ displayName: draft ?? "" }));
      close();
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Couldn't save your name."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingsRow
        icon="person-outline"
        label="Display name"
        value={displayName || "Add your name"}
        onPress={() => setDraft(displayName)}
      />
      <BottomSheetModal
        visible={draft !== null}
        title="Display name"
        onClose={close}
        rightAction={<SheetCloseButton onPress={close} />}
        footer={<Button label="Save" loading={saving} onPress={() => void save()} />}
      >
        <FormField
          label="Name"
          accessibilityLabel="Display name"
          value={draft ?? ""}
          onChangeText={setDraft}
          placeholder="What should we call you?"
          autoCapitalize="words"
          autoFocus
          maxLength={DISPLAY_NAME_MAX}
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
        {error ? (
          <AppText accessibilityRole="alert" style={{ color: tokens.colors.danger, marginTop: tokens.space[3] }}>
            {error}
          </AppText>
        ) : null}
      </BottomSheetModal>
    </>
  );
}
