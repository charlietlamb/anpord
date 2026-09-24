import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";

const UNREACHABLE = "Can't reach the server. Please try again.";

export async function signInWithGithub(callbackURL: string) {
  try {
    const { error } = await signIn.social({ provider: "github", callbackURL });
    if (!error) {
      return;
    }
    toast.error("Couldn't sign in with GitHub", { description: error.message });
  } catch {
    toast.error("Couldn't sign in with GitHub", { description: UNREACHABLE });
  }
}

export async function sendMagicLink(email: string, callbackURL: string) {
  try {
    const { error } = await signIn.magicLink({ email, callbackURL });
    if (error) {
      toast.error("Couldn't send the magic link", {
        description: error.message,
      });
      return false;
    }
    toast.success("Magic link sent", {
      description: `Check ${email} for your sign-in link.`,
    });
    return true;
  } catch {
    toast.error("Couldn't send the magic link", { description: UNREACHABLE });
    return false;
  }
}
