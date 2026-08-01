export default class OkReporter {
  onTestEnd(test, result) {
    const status = result.status === "passed" ? "OK" : "NO OK";
    console.log(`${status} - ${test.titlePath().join(" > ")}`);
  }
}
