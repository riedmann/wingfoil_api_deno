import { assertEquals } from "@std/assert";

Deno.test("Hello World", async () => {
  const res = await fetch("http://localhost:8000/");
  const data = await res.json();

  assertEquals(res.status, 200);
});
