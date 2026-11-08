package io.firsthit.studio;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Three native 16:10 animated views: log-binned first-hit frequency, rolling block means,
 * and the last 96 hits as a digit-position heat strip. Plot sampling never affects results. */
public final class InsightChart extends View {
    public static final int HISTOGRAM=0, BLOCK_MEAN=1, HEAT_STRIP=2;
    private static final int BG=0xFF151E30, INK=0xFFF2F3F5, MUTE=0xFF94A5C3;
    private static final int BLUE=0xFF75A2FF, CORAL=0xFFFF8B72, LIME=0xFFCBED84;
    private static final double[] BUCKET_ENDS={1,2,3,4,5,6,7,8,9,10,12,15,20,30,50,80,125,200,400,800,1600,Double.POSITIVE_INFINITY};
    private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final ArrayList<ConvergenceChart.Point> rolling=new ArrayList<>();
    private final ArrayList<Double> hits=new ArrayList<>();
    private final long[] frequencies=new long[BUCKET_ENDS.length];
    private final int type;
    private int selected=-1;
    private boolean live=false;
    private float phase=1f;
    private ValueAnimator revealAnimator;
    private long lastSet=0;

    public InsightChart(Context context,int which) {super(context);type=which;setLayerType(View.LAYER_TYPE_HARDWARE,null);}
    private float dp(float v) { return v*getResources().getDisplayMetrics().density; }
    @Override protected void onMeasure(int wSpec,int hSpec) {int w=MeasureSpec.getSize(wSpec);setMeasuredDimension(w,Math.round(w*10f/16f));}
    public void setLive(boolean value) {live=value;invalidate();}
    public void setHistogram(long[] data) {System.arraycopy(data,0,frequencies,0,Math.min(data.length,frequencies.length));redraw();}
    public static int bins(){return BUCKET_ENDS.length;}
    public static int bucketOf(double value){for(int i=0;i<BUCKET_ENDS.length;i++)if(value<=BUCKET_ENDS[i])return i;return BUCKET_ENDS.length-1;}
    public void setBlocks(List<ConvergenceChart.Point> data) {rolling.clear();rolling.addAll(data);redraw();}
    public void setHits(List<Double> data) {hits.clear();hits.addAll(data);redraw();}
    private void redraw(){
        long now=android.os.SystemClock.uptimeMillis();
        if(!live && now-lastSet>800) {
            if(revealAnimator!=null)revealAnimator.cancel();
            revealAnimator=ValueAnimator.ofFloat(.72f,1f);revealAnimator.setDuration(380);
            revealAnimator.addUpdateListener(a->{phase=(Float)a.getAnimatedValue();postInvalidateOnAnimation();});revealAnimator.start();
        } else {phase=1f;postInvalidateOnAnimation();}
        lastSet=now;
    }
    private void label(Canvas c,String t,float x,float y,int color,float size,boolean bold){
        p.reset();p.setAntiAlias(true);p.setColor(color);p.setTextSize(dp(size));
        p.setTypeface(android.graphics.Typeface.create(bold?"sans-serif-medium":"sans-serif",bold?1:0));c.drawText(t,x,y,p);
    }
    private String nf(double value) {if(!Double.isFinite(value))return "—";return String.format(Locale.US,"%.2f",value);}
    private String compact(long value){return value>=1_000_000?String.format(Locale.US,"%.1fm",value/1e6):value>=1000?String.format(Locale.US,"%.1fk",value/1e3):Long.toString(value);}
    @Override protected void onDraw(Canvas c) {
        super.onDraw(c);
        final float w=getWidth(),h=getHeight(),l=dp(34),r=w-dp(15),top=dp(49),bottom=h-dp(34);
        p.setColor(BG);p.setStyle(Paint.Style.FILL);c.drawRoundRect(new RectF(0,0,w,h),dp(18),dp(18),p);
        String header=type==HISTOGRAM?"01   /   FREQUENCY · 位置分布":type==BLOCK_MEAN?"02   /   BLOCK MEAN · 分段均值":"03   /   HIT MAP · 最近命中";
        label(c,header,dp(15),dp(25),MUTE,10,true);
        if(type==HISTOGRAM) drawHistogram(c,l,r,top,bottom);
        else if(type==BLOCK_MEAN) drawBlocks(c,l,r,top,bottom);
        else drawHeat(c,l,r,top,bottom);
        if(live){p.setStyle(Paint.Style.FILL);p.setColor(LIME);c.drawCircle(w-dp(21),dp(21),dp(3),p);}
    }
    private void drawHistogram(Canvas c,float l,float r,float t,float b){
        long max=0,total=0;for(long v:frequencies){max=Math.max(max,v);total+=v;}
        if(total==0){label(c,"运行后显示每个首现位置区间的样本数",l,(t+b)/2,MUTE,11,false);return;}
        float width=(r-l)/frequencies.length,space=Math.min(dp(2),width*.22f);
        for(int i=0;i<frequencies.length;i++){
            float bh=(b-t)*.94f*(float)frequencies[i]/Math.max(1,max)*phase;
            p.setColor(selected==i?LIME:(i%2==0?BLUE:0xFF4D76C5));p.setStyle(Paint.Style.FILL);
            float x=l+i*width;c.drawRoundRect(x+space,b-bh,x+width-space,b,dp(1.8f),dp(1.8f),p);
        }
        label(c,"1",l,b+dp(17),MUTE,9,false);
        label(c,"10",l+width*9,b+dp(17),MUTE,9,false);
        label(c,"50",l+width*14,b+dp(17),MUTE,9,false);
        label(c,">1600",r-dp(40),b+dp(17),MUTE,9,false);
        if(selected>=0){
            int i=Math.min(selected,frequencies.length-1);
            String range=i==0?"1":i==frequencies.length-1?">1600":i<=9?Integer.toString(i+1):
                (int)BUCKET_ENDS[i-1]+"–"+(int)BUCKET_ENDS[i];
            label(c,"区间 "+range+" · "+compact(frequencies[i])+" 个",l,t-dp(10),INK,12,true);
        }else label(c,"合计 "+compact(total)+" 个已完成样本",l,t-dp(10),INK,11,true);
    }
    private void drawBlocks(Canvas c,float l,float r,float t,float b){
        if(rolling.isEmpty()){label(c,"每 100 个完整样本形成一个均值区间",l,(t+b)/2,MUTE,11,false);return;}
        double min=Double.POSITIVE_INFINITY,max=Double.NEGATIVE_INFINITY;
        for(ConvergenceChart.Point q:rolling){min=Math.min(min,q.mean);max=Math.max(max,q.mean);}
        double padding=Math.max(.5,(max-min)*.25);min-=padding;max+=padding;
        for(int j=0;j<=3;j++){
            float y=t+(b-t)*j/3;p.setColor(0xFF2F4059);p.setStrokeWidth(dp(.8f));c.drawLine(l,y,r,y,p);
            label(c,nf(max-(max-min)*j/3),dp(3),y+dp(3),MUTE,9,false);
        }
        double n0=rolling.get(0).n,n1=rolling.get(rolling.size()-1).n;
        Path path=new Path();float yEnd=0,xEnd=0;
        for(int i=0;i<rolling.size();i++) {
            ConvergenceChart.Point q=rolling.get(i);
            float x=(float)(l+(q.n-n0)/Math.max(1,n1-n0)*(r-l));
            float y=(float)(b-(q.mean-min)/Math.max(.001,max-min)*(b-t));
            if(i==0)path.moveTo(x,y);else path.lineTo(x,y);xEnd=x;yEnd=y;
        }
        p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(dp(2.5f));p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);p.setColor(LIME);c.drawPath(path,p);
        p.setStyle(Paint.Style.FILL);p.setColor(CORAL);c.drawCircle(xEnd,yEnd,dp(3.7f),p);
        int pos=selected<0?rolling.size()-1:Math.min(selected,rolling.size()-1);
        ConvergenceChart.Point q=rolling.get(pos);
        label(c,"截至 #"+compact((long)q.n)+" · 区间均值 "+nf(q.mean),l,t-dp(10),INK,11,true);
        label(c,compact((long)n0),l,b+dp(17),MUTE,9,false);label(c,compact((long)n1),r-dp(35),b+dp(17),MUTE,9,false);
    }
    private void drawHeat(Canvas c,float l,float r,float t,float b){
        if(hits.isEmpty()){label(c,"最近 96 个样本的首次出现位置热度",l,(t+b)/2,MUTE,11,false);return;}
        final int cols=12, rows=8; float cw=(r-l)/cols,ch=(b-t)/rows;
        double max=0;for(double v:hits) max=Math.max(max,v);
        int length=hits.size();
        for(int i=0;i<Math.min(96,length);i++){
            int hist=length-Math.min(96,length)+i;
            double v=hits.get(hist);double intensity=Math.min(1,Math.log1p(v)/Math.log1p(Math.max(1,max)));
            int red=(int)(32+intensity*70),green=(int)(63+intensity*110),blue=(int)(94+intensity*160);
            if(selected==i){red=203;green=237;blue=132;}
            int x=i%cols,y=i/cols;
            float gap=dp(2);p.setStyle(Paint.Style.FILL);p.setColor(Color.rgb(red,green,blue));
            float x1=l+x*cw+gap,y1=t+y*ch+gap;
            c.drawRoundRect(x1,y1,x1+cw-gap*2,y1+ch-gap*2,dp(3),dp(3),p);
        }
        label(c,"更深的蓝色代表更靠后的首次出现位置",l,b+dp(19),MUTE,9,false);
        if(selected>=0&&selected<Math.min(96,length)){
            int hist=length-Math.min(96,length)+selected;
            label(c,"第 "+(hist+1)+" 格 · 首现位置 "+compact(hits.get(hist).longValue()),l,t-dp(10),INK,11,true);
        }else label(c,"最近 "+Math.min(96,length)+" 条记录 · 点按查看",l,t-dp(10),INK,11,true);
    }
    @Override public boolean onTouchEvent(MotionEvent e){
        if(e.getAction()==MotionEvent.ACTION_DOWN||e.getAction()==MotionEvent.ACTION_MOVE){
            float x=e.getX(),y=e.getY();float l=dp(34),r=getWidth()-dp(15);
            float v=Math.max(0,Math.min(.999f,(x-l)/Math.max(1,r-l)));
            if(type==HISTOGRAM)selected=(int)(v*frequencies.length);
            else if(type==BLOCK_MEAN)selected=rolling.isEmpty()?-1:(int)(v*(rolling.size()-1));
            else {
                float t=dp(49),b=getHeight()-dp(34);
                int col=(int)(v*12),row=Math.max(0,Math.min(7,(int)((y-t)/Math.max(1,(b-t)/8))));
                selected=row*12+col;
            }
            postInvalidateOnAnimation();return true;
        }
        if(e.getAction()==MotionEvent.ACTION_UP){performClick();return true;}
        return super.onTouchEvent(e);
    }
    @Override public boolean performClick(){super.performClick();return true;}
}
