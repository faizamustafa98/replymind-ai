import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — ReplyMind",
  description: "How ReplyMind accesses, uses, and protects your Gmail data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <img src="/logo-mark.svg" alt="ReplyMind" className="h-7 w-7" />
          <span className="text-base font-medium text-on-surface">ReplyMind</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 text-on-surface">
        <h1 className="text-3xl font-medium mb-2">Privacy Policy</h1>
        <p className="text-sm text-on-surface-variant mb-10">Last updated: July 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-on-surface-variant">
          <section>
            <h2 className="text-lg font-medium text-on-surface mb-2">What ReplyMind Is</h2>
            <p>
              ReplyMind is a customer-support tool for business owners. A business owner connects
              their own Gmail account so that customer emails sent to that inbox appear in a
              unified dashboard, and an AI drafts a suggested reply grounded in the business&apos;s
              own uploaded documents. The owner can review, edit, and send that reply — or, above a
              confidence threshold they configure themselves, ReplyMind can send it automatically.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-on-surface mb-2">What Gmail Data We Access</h2>
            <p className="mb-2">
              When a business owner connects Gmail, ReplyMind requests the following Google OAuth
              scopes:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <code className="text-xs bg-surface-container-low px-1.5 py-0.5 rounded">gmail.modify</code>{" "}
                — to read incoming customer emails and mark them as read once processed
              </li>
              <li>
                <code className="text-xs bg-surface-container-low px-1.5 py-0.5 rounded">gmail.send</code>{" "}
                — to send the owner&apos;s approved (or auto-sent) reply from their own address
              </li>
            </ul>
            <p className="mt-2">
              ReplyMind never accesses emails unrelated to customer support flows beyond what these
              scopes technically permit, never deletes mail, and never modifies anything other than
              the read/unread status of a message it has just processed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-on-surface mb-2">How This Data Is Used</h2>
            <p>
              The content of an incoming email is used only to: (1) classify whether it needs a
              reply, (2) retrieve relevant context from the business&apos;s own uploaded knowledge
              base, and (3) generate a draft reply. This processing is done via OpenAI&apos;s API
              under ReplyMind&apos;s own account — email content is not used to train any model, ours
              or OpenAI&apos;s, and is not shared with, or sold to, any third party.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-on-surface mb-2">How We Store and Protect It</h2>
            <p>
              We do not store Gmail passwords. Instead, Google issues an OAuth refresh token, which
              we encrypt at rest (Fernet/AES) before storing it, scoped strictly to the business
              that connected it. Access tokens used to call Gmail&apos;s API are short-lived
              (~1 hour) and are re-issued from the encrypted refresh token on demand rather than
              cached anywhere. Customer email content and AI-drafted replies are stored in our
              database, access-controlled per business account, so one business can never see
              another&apos;s data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-on-surface mb-2">Revoking Access</h2>
            <p>
              A business owner can disconnect Gmail at any time from Settings inside ReplyMind,
              which stops all further access immediately, or directly from their{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Google Account permissions page
              </a>
              . Disconnecting does not delete previously processed email content from our database;
              a business owner can request full deletion by contacting us (below).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-on-surface mb-2">Google API Services User Data Policy</h2>
            <p>
              ReplyMind&apos;s use and transfer of information received from Google APIs adheres to
              the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-on-surface mb-2">Contact</h2>
            <p>
              Questions about this policy or a data-deletion request can be sent to the business
              contact listed on the ReplyMind homepage.
            </p>
          </section>
        </div>

        <Link href="/" className="inline-block mt-12 text-sm text-primary underline">
          ← Back to ReplyMind
        </Link>
      </main>
    </div>
  );
}
