/**
 * Mock OAuthButtons component for testing
 * This replaces the dynamic import during tests
 */

import React from "react";
import { Button } from "@/components/ui/button";

export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Button
        variant="outline"
        className="w-full"
        data-testid="google-oauth-button"
      >
        Continue with Google
      </Button>
      <Button
        variant="outline"
        className="w-full"
        data-testid="facebook-oauth-button"
      >
        Continue with Facebook
      </Button>
    </div>
  );
}
