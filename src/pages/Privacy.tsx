import Layout from "@/components/Layout";

const Privacy = () => {
  return (
    <Layout>
      <section className="pt-24 pb-16 bg-sand">
        <div className="container mx-auto px-4 max-w-3xl py-8">
          <h1 className="text-4xl font-display font-bold text-foreground mb-6">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: 2026</p>
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <p>
              Wanderly ("we", "our", or "the app") is committed to protecting your privacy. This policy describes how we collect, use, and safeguard your information when you use our travel planning and community features.
            </p>
            <h2 className="text-lg font-semibold text-foreground mt-8">Information we collect</h2>
            <p>
              We collect information you provide directly, such as account details, trip preferences, and content you post in the community. We may also collect usage data (e.g. pages visited, features used) to improve the service.
            </p>
            <h2 className="text-lg font-semibold text-foreground mt-8">How we use it</h2>
            <p>
              Your data is used to deliver personalized itineraries, run the community safely, and improve our app. We do not sell your personal information to third parties.
            </p>
            <h2 className="text-lg font-semibold text-foreground mt-8">Data security</h2>
            <p>
              We use industry-standard measures to protect your data. Access to personal information is limited to what is necessary to operate and support the service.
            </p>
            <h2 className="text-lg font-semibold text-foreground mt-8">Your rights</h2>
            <p>
              You may request access, correction, or deletion of your personal data. You can also opt out of certain communications. Contact us using the details in "Get in Touch" for any privacy-related requests.
            </p>
            <p className="mt-8">
              By using Wanderly, you agree to this Privacy Policy. We may update it from time to time; we will notify users of significant changes.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Privacy;
