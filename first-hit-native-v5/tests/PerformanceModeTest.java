import io.firsthit.studio.FirstHitEngine;
import java.math.BigInteger;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

public class PerformanceModeTest {
    private static void ok(boolean yes,String what){if(!yes)throw new AssertionError(what);}
    public static void main(String[] args) throws Exception{
        FirstHitEngine.Signal signal=new FirstHitEngine.Signal();
        signal.setPerformanceMode(true,8);
        ok(signal.getConcurrencyLimit()==3,"smooth reserves at least five logical CPUs on 8-core device");
        signal.setPerformanceMode(false,8);
        ok(signal.getConcurrencyLimit()==8,"full enables all logical CPUs");
        signal.setPerformanceMode(true,2);
        ok(signal.getConcurrencyLimit()==1,"two-core device uses one search worker");
        ok(FirstHitEngine.Signal.smoothWorkers(1)==1,"single-core fallback");
        final AtomicReference<FirstHitEngine.Progress> finalResult=new AtomicReference<>();
        final AtomicReference<String> failure=new AtomicReference<>();
        FirstHitEngine.Spec spec=new FirstHitEngine.Spec("1",BigInteger.valueOf(2),BigInteger.valueOf(150),4);
        signal.setPerformanceMode(true,4);
        Thread t=new Thread(()->FirstHitEngine.run(spec,signal,new FirstHitEngine.Listener(){
            public void onBatch(List<FirstHitEngine.Observation> batch,FirstHitEngine.Progress progress){}
            public void onFinish(FirstHitEngine.Progress p,boolean cancelled,String error){
                finalResult.set(p);if(cancelled||error!=null)failure.set("cancelled="+cancelled+" error="+error);
            }
        }));
        t.start();Thread.sleep(20);
        signal.setPerformanceMode(false,4);
        ok(signal.getConcurrencyLimit()==4,"mode switches during active calculation");
        signal.setPerformanceMode(true,4);
        t.join(20000);
        ok(!t.isAlive(),"engine finishes within regression timeout");
        ok(failure.get()==null,"no error: "+failure.get());
        ok(finalResult.get().done.equals(BigInteger.valueOf(150)),"all ordered samples retained");
        System.out.println("PASS: mode switch, bounded thread budget, and all 150 samples complete");
    }
}
