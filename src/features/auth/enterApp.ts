import { router } from "expo-router";
import { useAuthStore } from "./store";
import { useBooksStore } from "@/features/books/store";

/** After any sign-in: an account with books goes home, a new one goes through onboarding. */
export async function enterApp() {
  const books = await useBooksStore.getState().loadBooks();
  if (books.length > 0) {
    useAuthStore.getState().completeOnboarding();
    router.replace("/(tabs)/home");
  } else {
    router.replace("/(onboarding)/currency");
  }
}
