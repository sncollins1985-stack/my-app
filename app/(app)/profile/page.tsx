import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { ProfileDetailsForm } from "@/components/profile-details-form";
import { ProfilePasswordForm } from "@/components/profile-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const profileDateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "long",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Europe/London",
});

function formatProfileDate(value: Date | null) {
  if (!value) {
    return "Not available";
  }

  return profileDateFormatter.format(value);
}

function getProfileDisplayName(firstName: string | null, lastName: string | null) {
  const fullName = [firstName ?? "", lastName ?? ""].filter(Boolean).join(" ").trim();

  return fullName || "Not set";
}

export default async function ProfilePage() {
  const authUser = await getCurrentUser();

  if (!authUser) {
    redirect("/login");
  }

  const userRecord = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "My profile" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your account details, update your name, and change the password used to sign in.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Account details</CardTitle>
              <CardDescription>
                The current sign-in details for this account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-muted-foreground">Name</p>
                <p className="mt-1 font-medium text-foreground">
                  {getProfileDisplayName(userRecord?.firstName ?? null, userRecord?.lastName ?? null)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-muted-foreground">Email address</p>
                <p className="mt-1 font-medium text-foreground">{authUser.email}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-muted-foreground">Account created</p>
                <p className="mt-1 font-medium text-foreground">
                  {formatProfileDate(authUser.createdAt)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-muted-foreground">Last signed in</p>
                <p className="mt-1 font-medium text-foreground">
                  {formatProfileDate(userRecord?.lastLoggedIn ?? null)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal details</CardTitle>
                <CardDescription>
                  Update how your name is stored for this account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileDetailsForm
                  initialFirstName={userRecord?.firstName ?? ""}
                  initialLastName={userRecord?.lastName ?? ""}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
                <CardDescription>
                  Enter your current password before choosing a new one.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfilePasswordForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
