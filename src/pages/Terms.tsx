import Layout from "@/components/Layout";

const Terms = () => {
  return (
    <Layout>
      <section className="pt-24 pb-16 bg-sand">
        <div className="container mx-auto px-4 max-w-3xl py-8">
          <h1 className="text-4xl font-display font-bold text-foreground mb-6">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: 2026</p>
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <p>
              Welcome to Wanderlust. By using our app, you agree to these Terms of Service. Please read them carefully.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Use of the service</h2>
            <p>
              Wanderlust provides AI-powered trip planning, destination discovery, and a travel community. You must use the service in accordance with these terms and applicable laws.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Community guidelines – travel-only content</h2>
            <p>
              <strong className="text-foreground">Community posts must be related to travel only.</strong> This includes trip experiences, destination tips, photos from your travels, and travel-related questions or advice. Content that is not travel-related is not allowed.
            </p>
            <p>
              <strong className="text-foreground">Strict action for invalid posts:</strong> Users who post content that is off-topic, spam, misleading, or otherwise in violation of our guidelines will receive a warning and may face strict action, including removal of content, suspension, or permanent restriction of their account. We reserve the right to take immediate action when necessary to keep the community safe and relevant for travelers.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Acceptable use</h2>
            <p>
              You may not use the service to harass others, post illegal content, or attempt to circumvent security or access controls. Failure to comply may result in termination of your access.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Intellectual property</h2>
            <p>
              The app, its design, and our content are owned by Wanderlust or our licensors. You retain ownership of the content you post but grant us a license to use it to operate and display the community and related features.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Disclaimer</h2>
            <p>
              Trip suggestions and community content are for inspiration and information only. We are not responsible for the accuracy of third-party information or for your travel decisions. Always verify important details (e.g. visas, bookings) independently.
            </p>

            <p className="mt-8">
              By continuing to use Wanderlust, you agree to these Terms. We may update them from time to time; continued use after changes constitutes acceptance.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Terms;
