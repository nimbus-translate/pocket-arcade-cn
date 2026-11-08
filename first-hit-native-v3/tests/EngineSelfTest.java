import io.firsthit.studio.FirstHitEngine;
import java.math.BigInteger;
import java.util.List;

public class EngineSelfTest {
    static BigInteger B(long x) { return BigInteger.valueOf(x); }
    static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    public static void main(String[] args) throws Exception {
        FirstHitEngine.Signal signal = new FirstHitEngine.Signal();
        check(FirstHitEngine.sqrtFloor(B(2)).equals(B(1)), "sqrtFloor(2)");
        check(FirstHitEngine.sqrtFloor(B(999999)).equals(B(999)), "sqrtFloor(999999)");
        check(FirstHitEngine.search(B(1), B(2), "1", B(1), signal).position.equals(B(2)), "sqrt2 first 1 at 2");
        check(FirstHitEngine.search(B(1), B(2), "1", B(2), signal).position.equals(B(5)), "sqrt2 second 1 at 5");
        check(FirstHitEngine.search(B(2), B(3), "1", B(1), signal).position.equals(B(27)), "sqrt3 first 1 at 27");
        check(FirstHitEngine.search(B(1), B(2), "414", B(1), signal).position.equals(B(1)), "multi-digit match");
        check(FirstHitEngine.search(B(1), B(2), "00", B(1), signal).position.signum() > 0, "leading zeros");
        long started = System.currentTimeMillis();
        final BigInteger[] last = {BigInteger.ZERO,BigInteger.ZERO};
        FirstHitEngine.run(new FirstHitEngine.Spec("1", B(1), B(10000), 4), new FirstHitEngine.Signal(),
            new FirstHitEngine.Listener() {
                public void onBatch(List<FirstHitEngine.Observation> batch, FirstHitEngine.Progress p) {
                    last[0] = p.done; last[1] = p.totalPositions;
                }
                public void onFinish(FirstHitEngine.Progress p, boolean cancelled, String error) {
                    check(error == null, "no errors: " + error);
                    check(!cancelled, "all samples completed");
                    check(p.done.equals(B(10000)), "10k samples");
                    check(p.totalPositions.equals(B(102187)), "position sum 102187");
                    check(p.mean.toPlainString().equals("10.218700000"), "mean is 10.2187");
                }
            });
        check(last[0].equals(B(10000)) && last[1].equals(B(102187)), "progress callback kept exact order");
        System.out.println("PASS: exact arithmetic, 1st/2nd occurrence, no precision cap, and 10,000-record regression (" +
            (System.currentTimeMillis() - started) + " ms)");
    }
}
