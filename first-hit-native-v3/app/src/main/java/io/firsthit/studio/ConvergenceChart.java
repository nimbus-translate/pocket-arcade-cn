package io.firsthit.studio;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** High-fidelity native Canvas, exactly 16:10, touch scrubbing, animated traces. */
public class ConvergenceChart extends View {
    public static final class Point {
        public final double n, mean;
        public Point(double n, double mean) { this.n = n; this.mean = mean; }
    }
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final ArrayList<Point> points = new ArrayList<>();
    private final int WHITE = Color.rgb(248, 247, 244);
    private final int INK = Color.rgb(21, 29, 42);
    private final int BLUE = Color.rgb(93, 145, 255);
    private final int BLUE_LIGHT = Color.rgb(166, 192, 255);
    private final int CORAL = Color.rgb(255, 126, 99);
    private float reveal = 1f;
    private float scrub = -1f;
    private int backgroundColor = INK;
    private Double theoryReference = 10.0;
    private ValueAnimator animator;
    public void setTheoryReference(Double value) { theoryReference = value; invalidate(); }

    public ConvergenceChart(Context ctx) { super(ctx); }
    public ConvergenceChart(Context ctx, AttributeSet attrs) { super(ctx, attrs); }

    @Override protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int width = MeasureSpec.getSize(widthMeasureSpec);
        int height = Math.round(width * 10f / 16f);
        setMeasuredDimension(width, height);
    }
    public void setPoints(List<Point> data, boolean animate) {
        points.clear(); points.addAll(data);
        if (animator != null) animator.cancel();
        if (animate) {
            reveal = .02f;
            animator = ValueAnimator.ofFloat(.02f, 1f);
            animator.setDuration(850);
            animator.setInterpolator(x -> (float)(1 - Math.pow(1 - x, 3)));
            animator.addUpdateListener(a -> { reveal = (Float)a.getAnimatedValue(); invalidate(); });
            animator.start();
        } else { reveal = 1; invalidate(); }
    }
    private void label(Canvas c, String s, float x, float y, float size, int color, boolean bold) {
        paint.reset(); paint.setAntiAlias(true); paint.setColor(color);
        paint.setTextSize(size); paint.setTypeface(android.graphics.Typeface.create(bold ? "sans-serif-medium":"sans-serif", bold ? 1 : 0));
        c.drawText(s, x, y, paint);
    }
    private static String format(double v) {
        if (!Double.isFinite(v)) return "—";
        return String.format(Locale.US,"%.2f",v);
    }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        final float w=getWidth(), h=getHeight(), density=getResources().getDisplayMetrics().density;
        final float l=49*density, r=w-16*density, t=38*density, b=h-34*density;
        paint.setStyle(Paint.Style.FILL); paint.setColor(backgroundColor);
        canvas.drawRoundRect(new RectF(0,0,w,h),20*density,20*density,paint);
        label(canvas,"CONVERGENCE  /  LIVE",16*density,24*density,9*density,BLUE_LIGHT,true);
        if(points.isEmpty()) {
            label(canvas,"运行实验，观察曲线逐步生成",l,h/2,11*density,BLUE_LIGHT,false);
            return;
        }
        double min=Double.POSITIVE_INFINITY,max=Double.NEGATIVE_INFINITY;
        for(Point p: points) if(Double.isFinite(p.mean)) {min=Math.min(min,p.mean);max=Math.max(max,p.mean);}
        if(!Double.isFinite(min)) return;
        if(theoryReference != null && Double.isFinite(theoryReference)) {
            if(max<theoryReference) max=theoryReference;
            if(min>theoryReference) min=theoryReference;
        }
        double expand=Math.max(.8, (max-min)*.12);
        max+=expand;min=Math.max(0,min-expand);
        double span=Math.max(.0001,max-min), nEnd=points.get(points.size()-1).n;
        double nStart=points.get(0).n;
        float yRef=theoryReference == null ? -100 : (float)(b-(theoryReference-min)/span*(b-t));
        for(int i=0;i<=4;i++) {
            float y=t+i*(b-t)/4;
            paint.reset(); paint.setAntiAlias(true);paint.setColor(Color.argb(38,217,226,255)); paint.setStrokeWidth(.8f*density);
            canvas.drawLine(l,y,r,y,paint);
            label(canvas,format(max-span*i/4),8*density,y+3*density,9*density,0xFF91A1BF,false);
        }
        if(theoryReference != null && Double.isFinite(theoryReference)) {
            paint.reset();paint.setAntiAlias(true);paint.setStyle(Paint.Style.STROKE);
            paint.setColor(CORAL); paint.setStrokeWidth(1.15f*density);
            paint.setPathEffect(new DashPathEffect(new float[]{4*density,5*density},0));
            canvas.drawLine(l,yRef,r,yRef,paint);paint.setPathEffect(null);
        }
        float prevX=0,prevY=0; boolean first=true;
        Path trace=new Path(); Path fill=new Path();
        int visible=(int)Math.max(1,Math.ceil(points.size()*reveal));
        for(int i=0;i<visible && i<points.size();i++) {
            Point p=points.get(i);
            if(!Double.isFinite(p.n)||!Double.isFinite(p.mean))continue;
            float x=(float)(l + ((p.n-nStart) / Math.max(nEnd-nStart,1))*(r-l));
            float y=(float)(b - (p.mean-min)/span*(b-t));
            if(first){trace.moveTo(x,y);fill.moveTo(x,b);fill.lineTo(x,y);first=false;}
            else{trace.lineTo(x,y);fill.lineTo(x,y);}
            prevX=x;prevY=y;
        }
        if(!first) {
            fill.lineTo(prevX,b); fill.close();
            paint.setStyle(Paint.Style.FILL);
            paint.setShader(new LinearGradient(0,t,0,b,0x555D91FF,0x005D91FF,Shader.TileMode.CLAMP));
            canvas.drawPath(fill,paint);paint.setShader(null);
            paint.setStyle(Paint.Style.STROKE);paint.setStrokeJoin(Paint.Join.ROUND);paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setColor(BLUE);paint.setStrokeWidth(2.35f*density);
            canvas.drawPath(trace,paint);
            paint.setStyle(Paint.Style.FILL);paint.setColor(WHITE);canvas.drawCircle(prevX,prevY,3.15f*density,paint);
            paint.setColor(BLUE);canvas.drawCircle(prevX,prevY,2*density,paint);
        }
        label(canvas,formatCount(nStart),l,b+18*density,9*density,0xFF91A1BF,false);
        label(canvas,formatCount(nEnd),Math.max(l,r-50*density),b+18*density,9*density,0xFF91A1BF,false);
        if(scrub>=0f) {
            float x=l+(r-l)*scrub;
            int closest=0;double best=Double.POSITIVE_INFINITY;
            for(int i=0;i<points.size();i++) {
                double d=Math.abs((points.get(i).n-nStart)/Math.max(1,nEnd-nStart) - scrub);
                if(d<best){best=d;closest=i;}
            }
            Point p=points.get(closest);
            float y=(float)(b-(p.mean-min)/span*(b-t));
            paint.setColor(0x99DFE6F6);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(1*density);
            canvas.drawLine(x,t,x,b,paint);
            paint.setStyle(Paint.Style.FILL);paint.setColor(CORAL);canvas.drawCircle(x,y,4*density,paint);
            float boxW=118*density,boxH=38*density;
            float bx=Math.min(r-boxW,Math.max(l,x-boxW/2)),by=Math.max(t,y-47*density);
            paint.setColor(0xFFFAFAF7);canvas.drawRoundRect(bx,by,bx+boxW,by+boxH,8*density,8*density,paint);
            label(canvas,"N = "+formatCount(p.n),bx+9*density,by+15*density,9*density,INK,true);
            label(canvas,"μ = "+format(p.mean),bx+9*density,by+30*density,11*density,INK,true);
        }
    }
    private String formatCount(double n) { if(n>=1e9) return String.format(Locale.US,"%.2g",n);return String.format(Locale.US,"%,d",(long)n); }
    @Override public boolean onTouchEvent(MotionEvent event) {
        if(event.getAction()==MotionEvent.ACTION_DOWN || event.getAction()==MotionEvent.ACTION_MOVE) {
            float d=getResources().getDisplayMetrics().density;
            float l=49*d, r=getWidth()-16*d;
            scrub=Math.max(0,Math.min(1,(event.getX()-l)/(r-l)));
            invalidate();return true;
        }
        if(event.getAction()==MotionEvent.ACTION_UP) { performClick();return true; }
        return super.onTouchEvent(event);
    }
    @Override public boolean performClick(){ super.performClick();return true; }
    public void clearScrub(){scrub=-1;invalidate();}
}
