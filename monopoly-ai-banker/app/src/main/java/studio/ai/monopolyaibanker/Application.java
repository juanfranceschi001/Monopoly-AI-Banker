package studio.ai.monopolyaibanker;

import com.google.android.gms.ads.MobileAds;

public class Application extends android.app.Application {

    @Override
    public void onCreate() {
        super.onCreate();
        MobileAds.initialize(this);
    }
}
