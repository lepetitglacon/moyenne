import { defineConfig } from "vitest/config";
import path from "path";
import os from "os";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      SECRET_KEY: "test_secret_key_for_testing",
      BOT_API_KEY: "test_bot_api_key",
      PORT: "3001",
      LOG_LEVEL: "ERROR",
      TEST_DB_PATH: path.join(os.tmpdir(), "tilt_test.sqlite"),
    },
    setupFiles: ["./__tests__/setup.js"],
  },
});
