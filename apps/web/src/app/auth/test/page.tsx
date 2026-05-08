/**
 * Test page to isolate the hanging issue
 */

export const metadata = {
  title: "Test Page",
};

export default async function TestPage() {
  return (
    <div>
      <h1>Test Page Works!</h1>
      <p>If you can see this, the server is not hanging.</p>
    </div>
  );
}
