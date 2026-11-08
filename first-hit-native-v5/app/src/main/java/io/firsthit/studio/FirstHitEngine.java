package io.firsthit.studio;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletionService;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.LockSupport;

/** Exact base-10 square-root long division, searching until the requested occurrence is found.
 * No fixed fractional-digit cutoff. Overlapping matches are counted. */
public final class FirstHitEngine {
    private static final BigInteger ZERO = BigInteger.ZERO;
    private static final BigInteger ONE = BigInteger.ONE;
    private static final BigInteger TWO = BigInteger.valueOf(2);
    private static final BigInteger TEN = BigInteger.TEN;
    private static final BigInteger TWENTY = BigInteger.valueOf(20);
    private static final BigInteger HUNDRED = BigInteger.valueOf(100);
    private static final BigInteger[] DIGITS = new BigInteger[10];
    static { for (int i = 0; i < 10; i++) DIGITS[i] = BigInteger.valueOf(i); }

    private FirstHitEngine() {}

    public static final class Spec {
        public final String target;
        public final BigInteger occurrence, sampleCount;
        public final int threads;
        public Spec(String target, BigInteger occurrence, BigInteger sampleCount, int threads) {
            if (target == null || !target.matches("[0-9]+")) throw new IllegalArgumentException("目标必须是由 0–9 组成的非空数字串");
            if (occurrence == null || occurrence.signum() <= 0) throw new IllegalArgumentException("出现次数必须大于零");
            if (sampleCount == null || sampleCount.signum() <= 0) throw new IllegalArgumentException("样本数量必须大于零");
            this.target = target;
            this.occurrence = occurrence;
            this.sampleCount = sampleCount;
            this.threads = Math.max(1, threads);
        }
    }

    public static final class Observation {
        public final BigInteger index, radicand, position, digitsScanned;
        Observation(BigInteger index, BigInteger radicand, BigInteger position, BigInteger digitsScanned) {
            this.index = index; this.radicand = radicand; this.position = position; this.digitsScanned = digitsScanned;
        }
    }

    public static final class Progress {
        public final BigInteger done, requested, totalPositions, digitsScanned;
        public final BigDecimal mean;
        public final long elapsedMillis;
        Progress(BigInteger done, BigInteger requested, BigInteger totalPositions, BigInteger digitsScanned, long elapsedMillis) {
            this.done = done; this.requested = requested; this.totalPositions = totalPositions;
            this.digitsScanned = digitsScanned;
            this.mean = done.signum() == 0 ? BigDecimal.ZERO : new BigDecimal(totalPositions).divide(new BigDecimal(done), 9, RoundingMode.HALF_UP);
            this.elapsedMillis = elapsedMillis;
        }
    }

    public interface Listener {
        void onBatch(List<Observation> batch, Progress progress);
        void onFinish(Progress progress, boolean cancelled, String error);
    }

    /** Thread-safe live performance switch. A relaxed mode reserves CPU time for UI. */
    public static final class Signal {
        private final AtomicBoolean stopped = new AtomicBoolean(false);
        private volatile boolean paused;
        private volatile boolean smooth = true;
        private volatile int concurrentLimit = 1;
        private int working = 0, peakWorking = 0;
        public final AtomicLong examinedDigits = new AtomicLong(0);
        public volatile BigInteger latestRadicand = BigInteger.ZERO;

        public static int smoothWorkers(int cpuCount) {
            // At most three workers, typically half of the logical processors or fewer.
            return Math.max(1, Math.min(3, (Math.max(1, cpuCount) - 1) / 2));
        }
        public synchronized void setPerformanceMode(boolean smoothMode, int availableCpu) {
            smooth = smoothMode;
            concurrentLimit = smooth ? smoothWorkers(availableCpu) : Math.max(1, availableCpu);
            notifyAll();
        }
        public boolean isSmooth() { return smooth; }
        public int getConcurrencyLimit() { return concurrentLimit; }
        public synchronized int getActiveWorkers() { return working; }
        public synchronized int getPeakWorkers() { return peakWorking; }
        public synchronized void pause() { if (!stopped.get()) paused = true; notifyAll(); }
        public synchronized void resume() { paused = false; notifyAll(); }
        public synchronized void cancel() { stopped.set(true); paused = false; notifyAll(); }
        public synchronized boolean isPaused() { return paused; }
        public boolean isStopped() { return stopped.get(); }

        // A worker enters before processing a sample and gives up its slot afterwards.
        // Changing mode while running changes capacity without destroying completed work.
        synchronized void enterWork() throws InterruptedException {
            while (!stopped.get() && (paused || working >= concurrentLimit)) wait(120L);
            if (stopped.get() || Thread.currentThread().isInterrupted()) throw new InterruptedException("cancelled");
            working++; peakWorking=Math.max(peakWorking,working);
        }
        synchronized void leaveWork() { working--; notifyAll(); }
        void checkpoint() throws InterruptedException {
            if (stopped.get()) throw new InterruptedException("cancelled");
            synchronized (this) { while (paused && !stopped.get()) wait(120L); }
            if (stopped.get() || Thread.currentThread().isInterrupted()) throw new InterruptedException("cancelled");
            // Small cooperative breaks reduce CPU starvation, animation stutter and heat.
            // There is never a digit-search cutoff.
            if (smooth) LockSupport.parkNanos(220_000L);
            if (stopped.get() || Thread.currentThread().isInterrupted()) throw new InterruptedException("cancelled");
        }
    }

    /** Find the floor of sqrt(n), using integer-only Newton iteration. */
    public static BigInteger sqrtFloor(BigInteger n) {
        if (n.signum() < 0) throw new IllegalArgumentException("negative radicand");
        if (n.compareTo(ONE) <= 0) return n;
        BigInteger x = ONE.shiftLeft((n.bitLength() + 1) / 2);
        while (true) {
            BigInteger y = x.add(n.divide(x)).shiftRight(1);
            if (y.compareTo(x) >= 0) return x;
            x = y;
        }
    }

    private static int[] prefixFunction(String pattern) {
        int[] pi = new int[pattern.length()];
        for (int i = 1, j = 0; i < pattern.length(); i++) {
            while (j > 0 && pattern.charAt(i) != pattern.charAt(j)) j = pi[j - 1];
            if (pattern.charAt(i) == pattern.charAt(j)) j++;
            pi[i] = j;
        }
        return pi;
    }

    /** Count kth occurrence, including overlapping substrings, in the exact decimal digits of sqrt(n).
     * Never labels a still-searching radicand "not found". */
    public static Observation search(BigInteger index, BigInteger n, String target,
                                     BigInteger ordinal, Signal signal) throws InterruptedException {
        return search(index, n, target, ordinal, prefixFunction(target), signal);
    }

    private static Observation search(BigInteger index, BigInteger n, String pattern,
                                      BigInteger ordinal, int[] pi, Signal signal) throws InterruptedException {
        signal.latestRadicand = n;
        BigInteger root = sqrtFloor(n);
        if (root.multiply(root).equals(n)) throw new IllegalArgumentException("radicand is a square");
        BigInteger prefix = root;
        BigInteger remainder = n.subtract(root.multiply(root));
        BigInteger position = ZERO, matches = ZERO;
        int state = 0;
        char[] letters = pattern.toCharArray();
        while (true) {
            // Read cancellation/pausing at regular intervals to keep very long searches responsive.
            if (position.and(BigInteger.valueOf(63)).signum() == 0) signal.checkpoint();
            remainder = remainder.multiply(HUNDRED);
            BigInteger baseline = prefix.multiply(TWENTY);
            int lo = 0, hi = 9;
            while (lo < hi) {
                int middle = (lo + hi + 1) >>> 1;
                BigInteger product = baseline.add(DIGITS[middle]).multiply(DIGITS[middle]);
                if (product.compareTo(remainder) <= 0) lo = middle;
                else hi = middle - 1;
            }
            int digit = lo;
            remainder = remainder.subtract(baseline.add(DIGITS[digit]).multiply(DIGITS[digit]));
            prefix = prefix.multiply(TEN).add(DIGITS[digit]);
            position = position.add(ONE);
            if (position.and(BigInteger.valueOf(63)).signum() == 0) signal.examinedDigits.addAndGet(64);
            char c = (char)('0' + digit);
            while (state > 0 && letters[state] != c) state = pi[state - 1];
            if (letters[state] == c) state++;
            if (state == letters.length) {
                matches = matches.add(ONE);
                if (matches.equals(ordinal)) {
                    return new Observation(index, n, position.subtract(BigInteger.valueOf(letters.length - 1L)), position);
                }
                state = pi[state - 1];
            }
        }
    }

    private static final class Item {
        final BigInteger index, n;
        Item(BigInteger index, BigInteger n) { this.index = index; this.n = n; }
    }
    private static final class GroupResult {
        final long batchId;
        final List<Observation> values;
        GroupResult(long batchId, List<Observation> values) { this.batchId = batchId; this.values = values; }
    }

    /** Parallel search; ordered aggregation preserves the exact cumulative-mean definition. */
    public static void run(Spec spec, Signal signal, Listener listener) {
        long startedAt = System.currentTimeMillis();
        ExecutorService pool = Executors.newFixedThreadPool(spec.threads);
        CompletionService<GroupResult> completion = new ExecutorCompletionService<>(pool);
        final int batchSize = spec.target.length() >= 5 ? 2 : 8;
        final int inflightLimit = Math.max(2, spec.threads * 2);
        BigInteger nextIndex = ONE, nextN = TWO, nextSquareRoot = TWO, nextSquare = BigInteger.valueOf(4);
        BigInteger done = ZERO, sum = ZERO, scanned = ZERO;
        long sent = 0, accepted = 0, nextToEmit = 0;
        Map<Long, GroupResult> pending = new TreeMap<>();
        String failure = null;
        int[] pi = prefixFunction(spec.target);
        try {
            while (!signal.isStopped() && (nextIndex.compareTo(spec.sampleCount) <= 0 || accepted < sent)) {
                signal.checkpoint();
                while (!signal.isStopped() && sent - accepted < inflightLimit && nextIndex.compareTo(spec.sampleCount) <= 0) {
                    List<Item> work = new ArrayList<>(batchSize);
                    while (work.size() < batchSize && nextIndex.compareTo(spec.sampleCount) <= 0) {
                        if (nextN.equals(nextSquare)) {
                            nextSquareRoot = nextSquareRoot.add(ONE);
                            nextSquare = nextSquareRoot.multiply(nextSquareRoot);
                        } else {
                            work.add(new Item(nextIndex, nextN));
                            nextIndex = nextIndex.add(ONE);
                        }
                        nextN = nextN.add(ONE);
                    }
                    final long batchId = sent++;
                    final List<Item> inputs = work;
                    completion.submit(new Callable<GroupResult>() {
                        @Override public GroupResult call() throws Exception {
                            List<Observation> list = new ArrayList<>(inputs.size());
                            for (Item input : inputs) {
                                signal.enterWork();
                                try { list.add(search(input.index, input.n, spec.target, spec.occurrence, pi, signal)); }
                                finally { signal.leaveWork(); }
                            }
                            return new GroupResult(batchId, list);
                        }
                    });
                }
                if (accepted < sent) {
                    Future<GroupResult> f = completion.poll(200, TimeUnit.MILLISECONDS);
                    if (f == null) continue;
                    GroupResult got = f.get();
                    accepted++;
                    pending.put(got.batchId, got);
                    while (pending.containsKey(nextToEmit)) {
                        GroupResult ordered = pending.remove(nextToEmit++);
                        for (Observation o : ordered.values) {
                            done = done.add(ONE);
                            sum = sum.add(o.position);
                            scanned = scanned.add(o.digitsScanned);
                        }
                        listener.onBatch(ordered.values, new Progress(done, spec.sampleCount, sum, scanned, System.currentTimeMillis() - startedAt));
                    }
                }
            }
        } catch (InterruptedException e) {
            signal.cancel();
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            signal.cancel();
            Throwable root = e;
            while (root.getCause() != null) root = root.getCause();
            if (!(root instanceof InterruptedException)) failure = root.toString();
        } finally {
            signal.cancel();
            pool.shutdownNow();
            listener.onFinish(new Progress(done, spec.sampleCount, sum, scanned, System.currentTimeMillis() - startedAt),
                    done.compareTo(spec.sampleCount) < 0, failure);
        }
    }
}
