import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { getApiErrorMessage } from "@/shared/api/errors";
import { sendSupportMessage } from "@/shared/api/support";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { FormField } from "@/shared/ui/components/FormField";
import { IconButton } from "@/shared/ui/components/IconButton";
import { Sheet } from "@/shared/ui/components/Sheet";
import { tokens } from "@/shared/ui/theme/tokens";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export default function ContactSupportModal() {
  const router = useRouter();
  const showError = useUndoToastStore((state) => state.showError);
  const key = useRef(newIdempotencyKey());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const editSubject = (value: string) => {
    key.current = newIdempotencyKey();
    setSubject(value);
    setSendError(null);
  };
  const editMessage = (value: string) => {
    key.current = newIdempotencyKey();
    setMessage(value);
    setSendError(null);
  };

  const submit = async () => {
    setSubjectTouched(true);
    setMessageTouched(true);
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanSubject || !cleanMessage || isSending) return;

    setIsSending(true);
    setSendError(null);
    try {
      await sendSupportMessage(cleanSubject, cleanMessage, key.current);
      setSent(true);
    } catch (error) {
      const text = getApiErrorMessage(error, "Couldn't send your message. Please try again.");
      setSendError(text);
      showError(error, text);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Contact support"
        leftAction={<IconButton icon="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />}
        footer={sent ? undefined : (
          <Button
            label={isSending ? "Sending..." : "Send message"}
            onPress={submit}
            disabled={isSending || !subject.trim() || !message.trim()}
            loading={isSending}
            size="md"
          />
        )}
      >
        {sent ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState
              iconName="checkmark"
              title="Message sent"
              message="Thanks for reaching out. We'll reply to the email on your account."
              actionLabel="Done"
              onAction={() => router.back()}
            />
          </View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <AppText variant="sm" tone="muted" style={{ marginBottom: tokens.space[6] }}>
              Tell us what you need help with. We'll reply to the email on your account.
            </AppText>
            <FormField
              label="Subject"
              accessibilityLabel="Subject"
              placeholder="What can we help with?"
              value={subject}
              onChangeText={editSubject}
              onBlur={() => setSubjectTouched(true)}
              maxLength={120}
              editable={!isSending}
              error={subjectTouched && !subject.trim() ? "Subject is required." : undefined}
            />
            <FormField
              label="Message"
              accessibilityLabel="Message"
              placeholder="Describe the issue or question"
              value={message}
              onChangeText={editMessage}
              onBlur={() => setMessageTouched(true)}
              maxLength={5000}
              multiline
              showCount
              editable={!isSending}
              containerStyle={{ marginTop: tokens.space[5] }}
              error={messageTouched && !message.trim() ? "Message is required." : undefined}
            />
            {sendError ? (
              <AppText variant="sm" tone="danger" accessibilityRole="alert" style={{ marginTop: tokens.space[4] }}>
                {sendError}
              </AppText>
            ) : null}
          </ScrollView>
        )}
      </Sheet>
    </View>
  );
}
