import type { TransactionType } from "../../types/dto";

export type RootStackParamList = {
  Tabs: undefined;
  AddTransactionEntry: undefined;

  ReviewTransaction: {
    amountMinor?: number;
    currencySymbol?: string;
    categoryLabel?: string;
    categoryEmoji?: string;
    note?: string;
  };

  AddTransaction: { presetType?: TransactionType } | undefined;
  EditTransaction: { txId: string };
};

export type TabParamList = {
  Home: undefined;
  Insights: undefined;
  Budget: undefined;
  Profile: undefined;
};
