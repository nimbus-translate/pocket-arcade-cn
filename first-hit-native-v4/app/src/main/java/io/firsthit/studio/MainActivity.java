package io.firsthit.studio;

import android.app.Activity;
import android.animation.ObjectAnimator;
import android.os.SystemClock;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.text.Editable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Native Android editorial dashboard. No WebView and no JavaScript compute. */
public class MainActivity extends Activity {
    private static final int BG = 0xFFF2F0EA, PAPER = 0xFFFEFDF9, INK = 0xFF202735,
            MUTED = 0xFF788293, COBALT = 0xFF3155F5, CORAL=0xFFFF735B, LINE=0xFFD9DCD9,
            DARK = 0xFF151D2A, LIME = 0xFFDAF280;
    private static final BigInteger ONE=BigInteger.ONE;
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final ArrayList<ConvergenceChart.Point> chartData = new ArrayList<>();
    private final ArrayList<ConvergenceChart.Point> recentData = new ArrayList<>();
    private final ArrayList<String> recentRows = new ArrayList<>();
    private TextView meanValue, countValue, sumValue, statusText, detailText, sectionStatus,
            sampleHint, occurrenceHint, latestText, progressText, liveDots;
    private EditText targetInput, occurrenceInput, sampleInput;
    private SeekBar sampleSlider, ordinalSlider;
    private ConvergenceChart fullChart, zoomChart;
    private Button runButton, pauseButton, stopButton, exportButton;
    private ProgressBar progressBar;
    private LinearLayout recentContainer;
    private TextView chartLegend, performanceHint, frameHint;
    private Button smoothButton, turboButton;
    private InsightChart histogramChart, blockChart, heatChart;
    private final ArrayList<ConvergenceChart.Point> blockData = new ArrayList<>();
    private final ArrayList<Double> lastHitPositions = new ArrayList<>();
    private final long[] bucketCounts = new long[InsightChart.bins()];
    private BigInteger blockTotal = BigInteger.ZERO;
    private int blockCount = 0;
    private volatile boolean smoothMode = true;
    private final Object updatesLock = new Object();
    private final ArrayList<FirstHitEngine.Observation> bufferedResults = new ArrayList<>();
    private FirstHitEngine.Progress bufferedProgress;
    private boolean renderScheduled = false;
    private long lastCsvFlush=0;
    private ScrollView scrollView;
    private volatile FirstHitEngine.Signal currentSignal;
    private volatile boolean running=false, finished=false;
    private volatile int chartStep=1;
    private BigInteger totalDone=BigInteger.ZERO, totalSum=BigInteger.ZERO, targetCount=BigInteger.valueOf(10000);
    private BigInteger sampleMax=BigInteger.valueOf(20000), occurrenceMax=BigInteger.valueOf(20);
    private BufferedWriter csvWriter;
    private File resultFile;
    private BigInteger csvSum=BigInteger.ZERO;
    private int coreCount;
    private long runStarted;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        coreCount=Math.max(1,Runtime.getRuntime().availableProcessors());
        buildUI();
        loadDemo();
        ui.postDelayed(tick,350);
    }
    private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private GradientDrawable rect(int color,float radius,int lineColor){
        GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));
        if(lineColor!=0)d.setStroke(dp(1),lineColor);return d;
    }
    private TextView t(String value,int sp,int color, boolean bold){
        TextView v=new TextView(this); v.setText(value);v.setTextColor(color);v.setTextSize(sp);
        v.setFontFeatureSettings("kern");
        v.setTypeface(Typeface.create(bold ? "sans-serif-medium":"sans-serif",bold ? Typeface.BOLD:Typeface.NORMAL));
        v.setIncludeFontPadding(false);return v;
    }
    private TextView serif(String value,int sp,int color){
        TextView x=t(value,sp,color,false);x.setTypeface(Typeface.create("serif",Typeface.BOLD));x.setLetterSpacing(-.038f);return x;
    }
    private LinearLayout column(){LinearLayout v=new LinearLayout(this);v.setOrientation(LinearLayout.VERTICAL);return v;}
    private LinearLayout row(){LinearLayout v=new LinearLayout(this);v.setOrientation(LinearLayout.HORIZONTAL);v.setGravity(Gravity.CENTER_VERTICAL);return v;}
    private LinearLayout.LayoutParams lp(int w,int h){return new LinearLayout.LayoutParams(w<0?w:dp(w),h<0?h:dp(h));}
    private void pad(View v,int a,int b,int c,int d){v.setPadding(dp(a),dp(b),dp(c),dp(d));}
    private void gap(LinearLayout a,int height){View x=new View(this);a.addView(x,lp(1,height));}
    private TextView cap(String s){TextView v=t(s,10,MUTED,true);v.setLetterSpacing(.18f);return v;}
    private TextView badge(String text,int fg,int bg){TextView v=t(text,10,fg,true);v.setBackground(rect(bg,40,0));pad(v,11,8,11,8);return v;}
    private EditText field(String initial,boolean digits){
        EditText e=new EditText(this);e.setSingleLine(true); e.setText(initial);
        e.setTextColor(INK);e.setTextSize(20);e.setSelectAllOnFocus(false);
        e.setTypeface(Typeface.create("sans-serif-medium",Typeface.BOLD));
        e.setInputType(digits ? InputType.TYPE_CLASS_NUMBER : InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        e.setBackground(rect(0xFFF4F5F4,12,LINE));pad(e,14,12,14,12);
        return e;
    }
    private Button button(String text,int bg,int fg){
        Button b=new Button(this);b.setAllCaps(false);b.setText(text);b.setTextSize(14);b.setTypeface(Typeface.create("sans-serif-medium",Typeface.BOLD));b.setTextColor(fg);
        b.setBackground(rect(bg,13,0));b.setElevation(dp(0));b.setMinHeight(0);b.setMinimumHeight(0);return b;
    }
    private void animate(View v,int order){v.setAlpha(0);v.setTranslationY(dp(12));v.animate().alpha(1).translationY(0).setStartDelay(order*70L).setDuration(450).setInterpolator(new DecelerateInterpolator()).start();}

    private void buildUI(){
        scrollView=new ScrollView(this);scrollView.setFillViewport(true);scrollView.setBackgroundColor(BG);scrollView.setVerticalScrollBarEnabled(false);
        LinearLayout root=column();pad(root,18,18,18,42);scrollView.addView(root);
        setContentView(scrollView);
        LinearLayout nav=row();
        TextView mark=serif("F/",30,PAPER);mark.setBackground(rect(DARK,10,0));mark.setGravity(Gravity.CENTER);
        nav.addView(mark,lp(54,54));
        LinearLayout titles=column();pad(titles,13,0,0,0);
        titles.addView(t("FIRST-HIT  /  STUDIO",13,INK,true));gap(titles,5);
        titles.addView(cap("MATHEMATICAL EXPERIMENT · 04"));
        nav.addView(titles,new LinearLayout.LayoutParams(0,dp(54),1));
        nav.addView(badge("NATIVE  •  V4",0xFF35523E,LIME));
        root.addView(nav);animate(nav,0);gap(root,28);

        LinearLayout hero=column();
        hero.addView(cap("A STUDY OF FIRST OCCURRENCE"));gap(hero,13);
        LinearLayout heroLine=row();
        TextView heading=serif("数位首现\n汇聚谱",44,INK);heading.setLineSpacing(dp(3),1.0f);
        heroLine.addView(heading,new LinearLayout.LayoutParams(0,-2,1));
        TextView glyph=serif("∑",72,COBALT);glyph.setGravity(Gravity.CENTER);heroLine.addView(glyph,lp(90,100));
        hero.addView(heroLine);gap(hero,11);
        hero.addView(t("从第一次，到第 r 次。\n没有人为截断的小数搜索。",13,MUTED,false));
        root.addView(hero);animate(hero,1);gap(root,24);

        LinearLayout inputs=column();inputs.setBackground(rect(PAPER,21,LINE));pad(inputs,18,20,18,20);
        LinearLayout h=row();h.addView(cap("01  /  实验配置"),new LinearLayout.LayoutParams(0,-2,1));h.addView(badge("EXACT / BIG INTEGER",COBALT,0xFFEDF0FF));inputs.addView(h);gap(inputs,20);
        inputs.addView(t("目标数字串",14,INK,true));gap(inputs,8);
        targetInput=field("1",false);targetInput.setHint("例如 1、14、001");
        inputs.addView(targetInput,lp(-1,56));gap(inputs,16);
        inputs.addView(t("寻找第几次出现",14,INK,true));gap(inputs,8);
        LinearLayout occRow=row();occurrenceInput=field("1",true);occRow.addView(occurrenceInput,new LinearLayout.LayoutParams(0,dp(54),1));
        TextView times=t(" 次",13,MUTED,true);pad(times,12,0,0,0);occRow.addView(times);
        inputs.addView(occRow);gap(inputs,7);
        ordinalSlider=new SeekBar(this);ordinalSlider.setMax(1000);ordinalSlider.setProgress(50);
        ordinalSlider.setProgressTintList(android.content.res.ColorStateList.valueOf(COBALT));
        ordinalSlider.setThumbTintList(android.content.res.ColorStateList.valueOf(COBALT));
        inputs.addView(ordinalSlider,lp(-1,30));
        occurrenceHint=t("滑到最右端继续扩展范围，也可直接输入任意正整数",11,MUTED,false);inputs.addView(occurrenceHint);
        gap(inputs,15);
        inputs.addView(t("无理数样本数量",14,INK,true));gap(inputs,8);
        sampleInput=field("10000",true);inputs.addView(sampleInput,lp(-1,54));gap(inputs,7);
        sampleSlider=new SeekBar(this);sampleSlider.setMax(1000);sampleSlider.setProgress(500);
        sampleSlider.setProgressTintList(android.content.res.ColorStateList.valueOf(COBALT));
        sampleSlider.setThumbTintList(android.content.res.ColorStateList.valueOf(COBALT));
        inputs.addView(sampleSlider,lp(-1,30));
        sampleHint=t("可连续扩展，无软件预设样本上限",11,MUTED,false);inputs.addView(sampleHint);
        gap(inputs,17);
        LinearLayout note=row();note.setBackground(rect(0xFFEFF3E0,12,0));pad(note,12,12,12,12);
        TextView noteIcon=t("∞",24,0xFF44663B,true);note.addView(noteIcon,lp(28,-2));
        TextView noteText=t("不设置搜索位数上限。未找到时持续搜索，不会丢弃样本。",12,0xFF35553D,false);
        pad(noteText,10,0,0,0);note.addView(noteText,new LinearLayout.LayoutParams(0,-2,1));inputs.addView(note);
        gap(inputs,20);
        inputs.addView(cap("COMPUTE BUDGET  /  计算性能"));gap(inputs,10);
        LinearLayout modes=row();
        smoothButton=button("流畅优先  ·  UI",DARK,PAPER);
        turboButton=button("全速运算  ·  MAX",0xFFE7EBF7,INK);
        LinearLayout.LayoutParams ml=new LinearLayout.LayoutParams(0,dp(51),1);ml.rightMargin=dp(6);
        modes.addView(smoothButton,ml);modes.addView(turboButton,new LinearLayout.LayoutParams(0,dp(51),1));
        inputs.addView(modes);gap(inputs,10);
        performanceHint=t("默认流畅模式：为图表、动画和触摸保留 CPU 资源。运行中也可切换。",12,MUTED,false);
        performanceHint.setLineSpacing(dp(3),1.1f);inputs.addView(performanceHint);
        gap(inputs,18);
        runButton=button("开始精确计算   ↗",COBALT,Color.WHITE);inputs.addView(runButton,lp(-1,54));
        LinearLayout controls=row();gap(inputs,8);
        pauseButton=button("暂停",0xFFE9ECF5,INK);pauseButton.setEnabled(false);
        stopButton=button("结束计算",0xFFFCECE8,0xFF9E4A41);stopButton.setEnabled(false);
        LinearLayout.LayoutParams ctrlA=new LinearLayout.LayoutParams(0,dp(46),1);ctrlA.rightMargin=dp(6);
        controls.addView(pauseButton,ctrlA);controls.addView(stopButton,new LinearLayout.LayoutParams(0,dp(46),1));inputs.addView(controls);
        root.addView(inputs);animate(inputs,2);gap(root,22);

        LinearLayout result=column();result.setBackground(rect(PAPER,21,LINE));pad(result,18,19,18,19);
        LinearLayout sHeader=row();sHeader.addView(cap("02  /  实时实验"),new LinearLayout.LayoutParams(0,-2,1));
        sectionStatus=badge("历史样本 / 预览",INK,0xFFEBEEE9);sHeader.addView(sectionStatus);
        result.addView(sHeader);gap(result,17);
        TextView headerLabel=t("累计平均位置",13,MUTED,false);result.addView(headerLabel);gap(result,4);
        meanValue=serif("10.2187",49,INK);result.addView(meanValue);gap(result,11);
        LinearLayout stats=row();
        LinearLayout stat1=column();stat1.addView(cap("已完成样本"));gap(stat1,8);countValue=t("10,000",18,INK,true);stat1.addView(countValue);
        LinearLayout stat2=column();stat2.addView(cap("位置总和"));gap(stat2,8);sumValue=t("102,187",18,INK,true);stat2.addView(sumValue);
        stats.addView(stat1,new LinearLayout.LayoutParams(0,-2,1));stats.addView(stat2,new LinearLayout.LayoutParams(0,-2,1));
        result.addView(stats);gap(result,17);
        progressBar=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progressBar.setMax(1000);progressBar.setProgress(1000);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(COBALT));
        result.addView(progressBar,lp(-1,5));gap(result,11);
        LinearLayout rowStatus=row();statusText=t("历史演示已载入",12,INK,true);rowStatus.addView(statusText,new LinearLayout.LayoutParams(0,-2,1));
        progressText=t("100%",12,COBALT,true);rowStatus.addView(progressText);result.addView(rowStatus);gap(result,7);
        detailText=t("计算使用原生 CPU 多线程和任意精度整数。",11,MUTED,false);result.addView(detailText);
        root.addView(result);animate(result,3);gap(root,25);

        LinearLayout chartHeader=row();
        LinearLayout chText=column();chText.addView(cap("03 / CONVERGENCE"));gap(chText,7);chText.addView(serif("平均值，如何浮动",26,INK));
        chartHeader.addView(chText,new LinearLayout.LayoutParams(0,-2,1));
        TextView chartMark=badge("16 : 10",COBALT,0xFFDFE4FF);chartHeader.addView(chartMark);
        root.addView(chartHeader);gap(root,13);
        fullChart=new ConvergenceChart(this);root.addView(fullChart,lp(-1,-2));gap(root,7);
        chartLegend=t("蓝色 · 实际累计平均值     橘色 · 随机模型期望 10",11,MUTED,false);root.addView(chartLegend);
        gap(root,25);
        root.addView(cap("04 / DETAIL VIEW"));gap(root,9);
        root.addView(serif("近期波动 · 放大",25,INK));gap(root,12);
        zoomChart=new ConvergenceChart(this);root.addView(zoomChart,lp(-1,-2));gap(root,9);
        TextView touchHelp=t("拖动查看数据 · 双指缩放 · 双击重置视窗",11,MUTED,false);root.addView(touchHelp);
        gap(root,25);

        root.addView(cap("05 / DISTRIBUTION"));gap(root,9);
        root.addView(serif("首次出现位置 · 频数",25,INK));gap(root,10);
        histogramChart=new InsightChart(this,InsightChart.HISTOGRAM);root.addView(histogramChart,lp(-1,-2));
        gap(root,6);root.addView(t("按起始位数分组统计，包含全部已完成样本；点按柱形查看频数。",11,MUTED,false));
        gap(root,24);

        root.addView(cap("06 / BLOCK AVERAGE"));gap(root,9);
        root.addView(serif("每 100 个样本的局部平均",25,INK));gap(root,10);
        blockChart=new InsightChart(this,InsightChart.BLOCK_MEAN);root.addView(blockChart,lp(-1,-2));
        gap(root,6);root.addView(t("观察短期变化与长期累计平均值的区别。",11,MUTED,false));
        gap(root,24);

        root.addView(cap("07 / POSITION HEAT MAP"));gap(root,9);
        root.addView(serif("最近命中 · 热力矩阵",25,INK));gap(root,10);
        heatChart=new InsightChart(this,InsightChart.HEAT_STRIP);root.addView(heatChart,lp(-1,-2));
        gap(root,6);root.addView(t("最后 96 条已完成记录，依照首次出现位置着色；点按查看。",11,MUTED,false));
        gap(root,24);

        LinearLayout records=column();records.setBackground(rect(PAPER,20,LINE));pad(records,17,18,17,18);
        LinearLayout recordTitle=row();recordTitle.addView(cap("08 / 原始记录"),new LinearLayout.LayoutParams(0,-2,1));
        exportButton=button("导出 CSV  ↗",DARK,PAPER);recordTitle.addView(exportButton,lp(120,40));records.addView(recordTitle);
        gap(records,13);latestText=t("实验开始后，这里显示最近完成的记录。",12,MUTED,false);records.addView(latestText);gap(records,12);
        recentContainer=column();records.addView(recentContainer);
        root.addView(records);gap(root,28);
        root.addView(cap("DIGIT FIRST-HIT CONVERGENCE SPECTRUM"));gap(root,6);
        root.addView(t("FIRST-HIT STUDIO © 2026   /   NATIVE COMPUTE\n只计算已完成的样本；未完成的样本不会进入平均值。",10,MUTED,false));
        wire();
    }

    private void wire(){
        runButton.setOnClickListener(v->startExperiment());
        stopButton.setOnClickListener(v->{ if(currentSignal!=null)currentSignal.cancel();stopButton.setEnabled(false);statusText.setText("正在中止 · 已完成结果保留"); });
        pauseButton.setOnClickListener(v->{
            FirstHitEngine.Signal s=currentSignal;if(s==null)return;
            if(s.isPaused()){s.resume();pauseButton.setText("暂停");statusText.setText("继续搜索中");}
            else{s.pause();pauseButton.setText("继续");statusText.setText("已暂停 · 结果未丢失");}
        });
        exportButton.setOnClickListener(v->exportCsv());
        smoothButton.setOnClickListener(v->changeMode(true));
        turboButton.setOnClickListener(v->changeMode(false));
        changeMode(true);
        ordinalSlider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            public void onStartTrackingTouch(SeekBar b){}
            public void onStopTrackingTouch(SeekBar b){}
            public void onProgressChanged(SeekBar b,int val,boolean user){
                if(!user)return;
                if(val>=995){occurrenceMax=occurrenceMax.multiply(BigInteger.TWO);b.setProgress(500);val=500;}
                BigInteger item=occurrenceMax.multiply(BigInteger.valueOf(Math.max(1,val))).divide(BigInteger.valueOf(1000)).max(ONE);
                occurrenceInput.setText(item.toString());occurrenceInput.setSelection(occurrenceInput.length());
                occurrenceHint.setText("当前滑动范围约 1–"+occurrenceMax+" 次 · 可直接输入更大数值");
            }
        });
        sampleSlider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            public void onStartTrackingTouch(SeekBar b){}
            public void onStopTrackingTouch(SeekBar b){}
            public void onProgressChanged(SeekBar b,int val,boolean user){
                if(!user)return;
                if(val>=995){sampleMax=sampleMax.multiply(BigInteger.TWO);b.setProgress(500);val=500;}
                BigInteger item=sampleMax.multiply(BigInteger.valueOf(Math.max(1,val))).divide(BigInteger.valueOf(1000)).max(ONE);
                sampleInput.setText(item.toString());sampleInput.setSelection(sampleInput.length());
                sampleHint.setText("滑动范围约 1–"+sampleMax+" 个样本 · 支持直接输入");
            }
        });
        occurrenceInput.addTextChangedListener(new InputWatcher(){public void afterTextChanged(Editable e){
            try{BigInteger x=new BigInteger(e.toString());if(x.signum()>0 && x.compareTo(occurrenceMax)>0){occurrenceMax=x.multiply(BigInteger.TWO);occurrenceHint.setText("滑动范围已扩展至 "+occurrenceMax);}}
            catch(Exception ignored){}
        }});
        sampleInput.addTextChangedListener(new InputWatcher(){public void afterTextChanged(Editable e){
            try{BigInteger x=new BigInteger(e.toString());if(x.signum()>0 && x.compareTo(sampleMax)>0){sampleMax=x.multiply(BigInteger.TWO);sampleHint.setText("滑动范围已扩展至 "+sampleMax);}}
            catch(Exception ignored){}
        }});
    }
    private void changeMode(boolean smooth){
        smoothMode=smooth;
        smoothButton.setBackground(rect(smooth?DARK:0xFFE7EBF7,13,0));
        smoothButton.setTextColor(smooth?PAPER:INK);
        turboButton.setBackground(rect(smooth?0xFFE7EBF7:DARK,13,0));
        turboButton.setTextColor(smooth?INK:PAPER);
        int chosen=smooth?FirstHitEngine.Signal.smoothWorkers(coreCount):coreCount;
        performanceHint.setText(smooth
            ? "流畅模式 · 并行 "+chosen+" 个计算线程（共 "+coreCount+" 核）。降低运算竞争，优先保持交互顺滑。"
            : "全速模式 · 允许并行 "+coreCount+" 个计算线程。尽量提高吞吐量，可能使图表变卡或设备发热。");
        FirstHitEngine.Signal live=currentSignal;
        if(live!=null && running){
            live.setPerformanceMode(smooth,coreCount);
            statusText.setText("已切换为"+(smooth?"流畅模式":"全速模式")+" · 正在调整并行工作量");
        }
        if(fullChart!=null)fullChart.setLive(running && smooth);
        if(zoomChart!=null)zoomChart.setLive(running && smooth);
        if(histogramChart!=null)histogramChart.setLive(running && smooth);
        if(blockChart!=null)blockChart.setLive(running && smooth);
        if(heatChart!=null)heatChart.setLive(running && smooth);
    }

    private abstract static class InputWatcher implements TextWatcher {
        public void beforeTextChanged(CharSequence s,int start,int count,int after){}
        public void onTextChanged(CharSequence s,int start,int before,int count){}
    }
    private static String number(BigInteger n){
        String s=n.toString();if(s.length()>18)return s.substring(0,6)+"… ("+s.length()+" 位)";
        return s.replaceAll("\\B(?=(\\d{3})+(?!\\d))",",");
    }
    private void startExperiment(){
        if(running){Toast.makeText(this,"请先结束当前计算",Toast.LENGTH_SHORT).show();return;}
        final FirstHitEngine.Spec spec;
        try {
            String target=targetInput.getText().toString().trim();
            String ordinal=occurrenceInput.getText().toString().trim();
            String count=sampleInput.getText().toString().trim();
            spec=new FirstHitEngine.Spec(target,new BigInteger(ordinal),new BigInteger(count),coreCount);
        }catch(Exception ex){Toast.makeText(this,"参数无效："+ex.getMessage(),Toast.LENGTH_LONG).show();return;}
        try{
            if(csvWriter!=null)csvWriter.close();
            resultFile=new File(getFilesDir(),"first_hit_"+System.currentTimeMillis()+".csv");
            csvWriter=new BufferedWriter(new OutputStreamWriter(new FileOutputStream(resultFile),StandardCharsets.UTF_8),32*1024);
            csvWriter.write("sample_index,radicand,occurrence,target,position,digits_scanned,running_mean\n");
        }catch(IOException e){Toast.makeText(this,"不能创建本地实验数据文件："+e.getMessage(),Toast.LENGTH_LONG).show();return;}
        csvSum=BigInteger.ZERO;totalSum=BigInteger.ZERO;totalDone=BigInteger.ZERO;targetCount=spec.sampleCount;
        chartStep=1;chartData.clear();recentData.clear();recentRows.clear();renderRecent();
        blockData.clear();lastHitPositions.clear();java.util.Arrays.fill(bucketCounts,0);
        blockTotal=BigInteger.ZERO;blockCount=0;
        histogramChart.setHistogram(bucketCounts);blockChart.setBlocks(blockData);heatChart.setHits(lastHitPositions);
        synchronized(updatesLock){bufferedResults.clear();bufferedProgress=null;renderScheduled=false;}
        fullChart.setPoints(chartData,false);zoomChart.setPoints(chartData,false);
        if(spec.target.length()==1) {
            double expected=spec.occurrence.doubleValue()*10.0;
            if(Double.isFinite(expected)){fullChart.setTheoryReference(expected);zoomChart.setTheoryReference(expected);
                chartLegend.setText("蓝色 · 实际累计平均值     橘色 · 独立随机模型期望 "+number(spec.occurrence.multiply(BigInteger.TEN)));}
            else {fullChart.setTheoryReference(null);zoomChart.setTheoryReference(null);chartLegend.setText("蓝色 · 实际累计平均值；目标次数过大，不显示理论参考线");}
        } else {fullChart.setTheoryReference(null);zoomChart.setTheoryReference(null);
            chartLegend.setText("蓝色 · 实际累计平均值；多位数字串的理论等待时间受重叠结构影响");}
        currentSignal=new FirstHitEngine.Signal();currentSignal.setPerformanceMode(smoothMode,coreCount);
        running=true;finished=false;runStarted=System.currentTimeMillis();lastCsvFlush=runStarted;
        changeMode(smoothMode);
        meanValue.setText("—");countValue.setText("0 / "+number(targetCount));sumValue.setText("0");
        progressBar.setProgress(0);progressText.setText("0%");statusText.setText("正在分配原生计算线程");
        detailText.setText("搜索目标 "+spec.target+" 的第 "+number(spec.occurrence)+" 次出现；不限制小数位数");
        sectionStatus.setText("LIVE / 搜索中");sectionStatus.setBackground(rect(0xFFE8EFFF,40,0));
        runButton.setEnabled(false);runButton.setText("计算进行中 · · ·");
        pauseButton.setEnabled(true);pauseButton.setText("暂停");stopButton.setEnabled(true);
        final FirstHitEngine.Signal signal=currentSignal;
        new Thread(()-> FirstHitEngine.run(spec,signal,new FirstHitEngine.Listener(){
            @Override public void onBatch(List<FirstHitEngine.Observation> batch,FirstHitEngine.Progress progress){
                try {
                    for(FirstHitEngine.Observation rec:batch){
                        csvSum=csvSum.add(rec.position);
                        BigDecimal runningMean=new BigDecimal(csvSum).divide(new BigDecimal(rec.index),12,RoundingMode.HALF_UP);
                        csvWriter.write(rec.index+","+rec.radicand+","+spec.occurrence+","+spec.target+","+rec.position+","+rec.digitsScanned+","+runningMean.toPlainString()+"\n");
                    }
                    long now=SystemClock.uptimeMillis();
                    if(now-lastCsvFlush>850){csvWriter.flush();lastCsvFlush=now;}
                }catch(IOException ex){signal.cancel();ui.post(()->statusText.setText("文件写入失败："+ex.getMessage()));}
                queueBatch(signal,batch,progress);
            }
            @Override public void onFinish(FirstHitEngine.Progress progress,boolean cancelled,String error){
                try{if(csvWriter!=null){csvWriter.flush();csvWriter.close();}}catch(IOException ignored){}
                ui.post(()->{if(signal!=currentSignal)return;
                    flushBatches(signal);
                    running=false;finished=!cancelled;changeMode(smoothMode);
                    runButton.setEnabled(true);runButton.setText("重新开始实验  ↗");
                    pauseButton.setEnabled(false);stopButton.setEnabled(false);
                    sectionStatus.setText(cancelled ? "PARTIAL / 未完成" : "DONE / 全部完成");
                    sectionStatus.setBackground(rect(cancelled ? 0xFFFCE7E4 : 0xFFE7F2DA,40,0));
                    statusText.setText(error!=null?"计算失败："+error:(cancelled?"实验已中止 · 导出的是部分结果":"实验完成 · 全部样本已计入"));
                    detailText.setText("共完成 "+number(progress.done)+" / "+number(progress.requested)+" 个样本，逐条结果已写入本地 CSV。");
                    if(progress.done.signum()>0)meanValue.setText(progress.mean.stripTrailingZeros().toPlainString());
                });
            }
        }),"first-hit-coordinator").start();
    }

    private void queueBatch(FirstHitEngine.Signal signal,List<FirstHitEngine.Observation> batch,FirstHitEngine.Progress progress){
        boolean shouldSchedule=false;
        synchronized(updatesLock){
            bufferedResults.addAll(batch);bufferedProgress=progress;
            if(!renderScheduled){renderScheduled=true;shouldSchedule=true;}
        }
        // Coalesce possibly hundreds of engine batches into one display update every 180 ms.
        // CSV and every mathematical observation still update on the compute coordinator.
        if(shouldSchedule)ui.postDelayed(()->flushBatches(signal),180);
    }
    private void flushBatches(FirstHitEngine.Signal signal){
        final ArrayList<FirstHitEngine.Observation> pending;
        final FirstHitEngine.Progress snapshot;
        synchronized(updatesLock){
            pending=new ArrayList<>(bufferedResults);bufferedResults.clear();
            snapshot=bufferedProgress;bufferedProgress=null;renderScheduled=false;
        }
        if(signal!=currentSignal || snapshot==null || pending.isEmpty())return;
        drawBatch(pending,snapshot);
    }

    private void drawBatch(List<FirstHitEngine.Observation> batch,FirstHitEngine.Progress progress){
        totalDone=progress.done;totalSum=progress.totalPositions;
        countValue.setText(number(progress.done)+" / "+number(progress.requested));
        sumValue.setText(number(progress.totalPositions));
        meanValue.setText(progress.mean.setScale(4,RoundingMode.HALF_UP).toPlainString());
        BigDecimal percentage=new BigDecimal(progress.done).multiply(BigDecimal.valueOf(1000)).divide(new BigDecimal(progress.requested),0,RoundingMode.DOWN);
        progressBar.setProgress(percentage.min(BigDecimal.valueOf(1000)).intValue());
        progressText.setText(percentage.divide(BigDecimal.TEN,1,RoundingMode.HALF_UP).toPlainString()+"%");
        int limit=currentSignal==null?0:currentSignal.getConcurrencyLimit();
        statusText.setText(currentSignal!=null&&currentSignal.isPaused()?"计算已暂停":"正在精确计算 · "+(smoothMode?"流畅":"全速")+" / 上限 "+limit+" 核");
        detailText.setText("已计算至 √"+number(batch.get(batch.size()-1).radicand)+" · 仅纳入已完成结果");
        // Chart decimation is visual only. Every observation is included in the exact arithmetic and CSV.
        BigInteger runningSum=progress.totalPositions;
        for(int i=batch.size()-1;i>=0;i--)runningSum=runningSum.subtract(batch.get(i).position);
        for(FirstHitEngine.Observation o:batch){
            runningSum=runningSum.add(o.position);
            if(o.index.mod(BigInteger.valueOf(chartStep)).signum()==0 || o.index.equals(progress.requested)) {
                double mean=new BigDecimal(runningSum).divide(new BigDecimal(o.index),9,RoundingMode.HALF_UP).doubleValue();
                chartData.add(new ConvergenceChart.Point(o.index.doubleValue(),mean));
                recentData.add(new ConvergenceChart.Point(o.index.doubleValue(),mean));
            }
            double position=o.position.doubleValue();
            bucketCounts[InsightChart.bucketOf(position)]++;
            blockTotal=blockTotal.add(o.position);blockCount++;
            if(blockCount==100){
                double average=new BigDecimal(blockTotal).divide(BigDecimal.valueOf(100),9,RoundingMode.HALF_UP).doubleValue();
                blockData.add(new ConvergenceChart.Point(o.index.doubleValue(),average));
                blockTotal=BigInteger.ZERO;blockCount=0;
            }
            lastHitPositions.add(position);
            if(lastHitPositions.size()>96)lastHitPositions.remove(0);
            recentRows.add("#"+number(o.index)+"     √"+number(o.radicand)+"     → 第 "+number(o.position)+" 位");
            if(recentRows.size()>7)recentRows.remove(0);
        }
        if(chartData.size()>2600){
            chartStep*=2;
            for(int i=chartData.size()-2;i>=0;i-=2)chartData.remove(i);
        }
        if(recentData.size()>640)recentData.subList(0,recentData.size()-640).clear();
        if(blockData.size()>1800){for(int i=blockData.size()-2;i>=0;i-=2)blockData.remove(i);}
        fullChart.setPoints(chartData,false);
        zoomChart.setPoints(recentData,false);
        histogramChart.setHistogram(bucketCounts);blockChart.setBlocks(blockData);heatChart.setHits(lastHitPositions);
        renderRecent();
    }
    private void renderRecent(){
        if(recentContainer==null)return;
        recentContainer.removeAllViews();
        if(recentRows.isEmpty()) {latestText.setText("实验开始后，这里显示最近完成的记录。");return;}
        latestText.setText("最近 "+recentRows.size()+" 条已完成记录 · 完整结果可导出");
        for(int i=recentRows.size()-1;i>=0;i--){
            TextView row=t(recentRows.get(i),12,INK,false);pad(row,8,11,8,11);
            row.setBackgroundColor(i%2==0 ? 0xFFF3F4F0 : PAPER);
            recentContainer.addView(row,lp(-1,-2));
        }
    }
    private final Runnable tick=new Runnable(){@Override public void run(){
        if(running && currentSignal!=null){
            long sec=Math.max(1,(System.currentTimeMillis()-runStarted)/1000);
            if(totalDone.signum()==0) {
                statusText.setText(currentSignal.isPaused()?"已暂停 · 当前样本仍待完成":"正在搜索 · 尚未完成首组样本");
                detailText.setText("当前搜索约 √"+number(currentSignal.latestRadicand)+" · 已探索至少 "+number(BigInteger.valueOf(currentSignal.examinedDigits.get()))+" 位 · 工作线程 "+currentSignal.getActiveWorkers()+" / "+currentSignal.getConcurrencyLimit()+" · "+sec+"s");
            }
        }
        ui.postDelayed(this,400);
    }};

    private void loadDemo(){
        ArrayList<ConvergenceChart.Point> preview=new ArrayList<>();
        try(InputStream in=getAssets().open("demo_curve.csv");BufferedReader br=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){
            String row;while((row=br.readLine())!=null){String[] p=row.split(",");if(p.length>=2)preview.add(new ConvergenceChart.Point(Double.parseDouble(p[0]),Double.parseDouble(p[1])));}
        }catch(Exception ignored){}
        fullChart.setPoints(preview,true);
        if(!preview.isEmpty()){
            int start=(int)(preview.size()*.65);
            zoomChart.setPoints(preview.subList(start,preview.size()),true);
        }
    }
    private void exportCsv(){
        if(resultFile==null||!resultFile.exists()){
            Toast.makeText(this,"请先运行实验。历史示例仅用于预览。",Toast.LENGTH_SHORT).show();return;
        }
        Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("text/csv");
        i.putExtra(Intent.EXTRA_TITLE,"first_hit_results.csv");
        startActivityForResult(i,303);
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==303 && resultCode==RESULT_OK && data!=null && data.getData()!=null && resultFile!=null){
            final Uri uri=data.getData();
            new Thread(()->{
                try(InputStream src=new FileInputStream(resultFile);OutputStream out=getContentResolver().openOutputStream(uri,"w")){
                    if(out==null)throw new IOException("无法打开目标文件");
                    byte[] buffer=new byte[65536];int count;
                    while((count=src.read(buffer))>=0)out.write(buffer,0,count);
                    ui.post(()->Toast.makeText(this,"CSV 已保存",Toast.LENGTH_LONG).show());
                }catch(Exception ex){ui.post(()->Toast.makeText(this,"保存失败："+ex.getMessage(),Toast.LENGTH_LONG).show());}
            }).start();
        }
    }
    @Override protected void onDestroy(){
        if(currentSignal!=null)currentSignal.cancel();
        ui.removeCallbacks(tick);
        super.onDestroy();
    }
}
