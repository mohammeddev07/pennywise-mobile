import { useState } from "react";
import { DISPLAY_NAME_MAX, useSettingsStore } from "../store";
import { BottomSheetModal, SheetCloseButton } from "@/shared/ui/components/BottomSheetModal";
import { SettingsRow } from "@/shared/ui/components/SettingsRow";
import { FormField } from "@/shared/ui/components/FormField";
import { Button } from "@/shared/ui/components/Button";

/** The name in Home's "Good afternoon, <name>". Stored on this device only. */
export function DisplayNameSetting() {
  const displayName = useSettingsStore((s) => s.displayName);
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);
  const [draft, setDraft] = useState<string | null>(null);
  const close = () => setDraft(null);
  const save = () => {
    setDisplayName(draft ?? "");
    close();
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
        footer={<Button label="Save" onPress={save} />}
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
          onSubmitEditing={save}
        />
      </BottomSheetModal>
    </>
  );
}
