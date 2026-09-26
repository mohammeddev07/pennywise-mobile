import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button, LinkButton } from "@/shared/ui/components/Button";
import { FormField } from "@/shared/ui/components/FormField";
import { BottomSheetModal, SheetCloseButton } from "@/shared/ui/components/BottomSheetModal";
import { useDelayedFlag } from "@/shared/ui/utils/useDelayedFlag";
import { getApiErrorMessage } from "@/shared/api/errors";
import { proposeFilter } from "@/shared/api/aiFilter";
import { fromWireFilter, fromWireSort } from "../aiFilterProposal";
import type { FilterRoot, SortState } from "../filterModel";

const MAX_CHARS = 500;

/**
 * "Describe your filter": a free-text question in, a complete replacement filter proposal out.
 * This never applies anything itself - a PROPOSAL hands the converted tree to the caller, which
 * opens it in the normal Advanced editor for review/edit/Apply. Nothing here talks to search or
 * analyze directly.
 */
export function DescribeFilterSheet({
  visible,
  onClose,
  bookId,
  onProposal,
}: {
  visible: boolean;
  onClose: () => void;
  bookId: string | null | undefined;
  onProposal: (root: FilterRoot, sort: SortState) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const slow = useDelayedFlag(loading, 4000);

  // Closing, or switching to a different book, invalidates whatever is in flight - its
  // response (if it still arrives) is ignored via the aborted signal below.
  useEffect(() => {
    if (!visible) {
      controllerRef.current?.abort();
      setText("");
      setLoading(false);
      setMessage(null);
    }
  }, [visible]);
  useEffect(() => () => controllerRef.current?.abort(), [bookId]);

  const generate = async () => {
    const question = text.trim();
    if (!bookId || !question || loading) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setMessage(null);
    try {
      const response = await proposeFilter(bookId, question, controller.signal);
      if (controller.signal.aborted) return;
      if (response.status === "PROPOSAL" && response.filter) {
        onProposal(fromWireFilter(response.filter), fromWireSort(response.sort));
        return;
      }
      setMessage(
        response.clarification ??
          response.limitation ??
          "Couldn't turn that into a filter. Try rephrasing, or use the manual filter."
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(getApiErrorMessage(error, "Couldn't reach the AI provider. Try again, or use the manual filter."));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const cancelGenerate = () => {
    controllerRef.current?.abort();
    setLoading(false);
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      scroll
      title="Describe your filter"
      rightAction={<SheetCloseButton onPress={onClose} />}
      footer={
        <Button
          label={loading ? (slow ? "Still thinking…" : "Generating…") : "Generate"}
          loading={loading}
          disabled={!text.trim()}
          onPress={generate}
        />
      }
    >
      <FormField
        label="Question"
        value={text}
        onChangeText={setText}
        placeholder='e.g. "Groceries over $50 last month"'
        multiline
        showCount
        maxLength={MAX_CHARS}
        editable={!loading}
      />
      <AppText variant="xs" tone="muted" style={{ marginTop: tokens.space[2] }}>
        Sent to our AI provider to build this filter, along with this book's category names. Review
        every condition before applying - this replaces your current filter, it does not merge with it.
      </AppText>

      {loading ? (
        <View style={{ alignItems: "flex-start", marginTop: tokens.space[3] }}>
          <LinkButton label="Cancel" tone="muted" onPress={cancelGenerate} />
        </View>
      ) : null}

      {message ? (
        <AppText
          variant="sm"
          tone="muted"
          role="alert"
          accessibilityLiveRegion="polite"
          style={{ marginTop: tokens.space[4] }}
        >
          {message}
        </AppText>
      ) : null}
    </BottomSheetModal>
  );
}
