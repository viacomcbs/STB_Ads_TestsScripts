var DAI = {
    version: '1.2',
    checkAd: function() {
        if (player.isAd) {
            console.log('[ADS] Player is at ad: PASS')
        } else {
            console.log('[ADS] Player is not at ad: FAIL')
        }
    },
    checkSeekAd: async function(ts, type) { // type: 'in' or 'to'
        var ret = false;
        var sec = parseFloat(ts);
        var messages = {
            to: `[ADS] seeking to ad located in ts ${sec.toFixed(2)} now, during content, at timestamp`,
            in: `[ADS] seeking to ts ${sec.toFixed(2)} now, during ad, at timestamp`
        };
        console.log(messages[type], player.streamTime.toFixed(2));
        try {
            ret = await player.seek(sec);
            console.info('[ADS] seek successful');
        } catch (e) {
            if (sec >= 0) {
                console.warn('[ADS] seek blocked');
            } else {
                console.warn('[ADS] missing timestamp for seek');
            }
            console.warn(e);
        }
        return ret;
    },
    transitionTime: 2, //time to wait for transition between ad and content/content and ad, in seconds
    adNav: async function(ts, type) {
        var ret;
        await this.checkSeekAd(ts, type); //seek to/in ad
        ret = await new Promise(r => setTimeout(r, this.transitionTime * 1000));
        this.checkAd();
        return ret;
    },
    getAdConfig: function() {
        var adConfigs = player.getAdBreakTimes()
        console.log('[ADS] Ad configs:', adConfigs)
        return adConfigs;
    },
    test: async function() {
        console.info('[ADS] DAI test version', this.version);
        //Check that a) app does not seek during ads and b) quality is maintained before and after ads
        var adsInfo = this.getAdConfig();
        var seekTime = 0;
        var adDuration;
        var quality;
        for (index = 0; index < adsInfo.length; index++) {
            console.log('[ADS] testing', index + 1, 'of', adsInfo.length, 'ad breaks...');
            adDuration = adsInfo[index].streamTimeEnd - adsInfo[index].streamTimeStart;
            // Not for preroll
            if (adsInfo[index].start > 0) {
                quality = player.quality.bitrate;
                console.log('[ADS] Quality before ad', quality, ', at timestamp', player.streamTime.toFixed(2));
                await this.adNav(adsInfo[index].streamTimeStart, 'to');
            }

            // index+1 will go beyond adsInfo length-1 last round of the loop
            // I e, when the last ad is playing, there is no next ad, so we seek towards end
            if (adsInfo[index + 1]) {
                seekTime = adsInfo[index + 1].streamTimeStart;
            } else {
                seekTime = player.streamDuration - 10;
            }
            await this.adNav(seekTime, 'in');
            await new Promise(r => setTimeout(r, (adDuration + this.transitionTime) * 1000)); //wait for ad to be over

            // Not for preroll
            if (adsInfo[index].start > 0) {
                console.log('[ADS] Content restored after ads: ', !player.isAd, 'at ts ', player.streamTime.toFixed(2));
                if (player.quality) {
                    console.log('[ADS] Quality after ad', player.quality.bitrate, ', at timestamp', player.streamTime.toFixed(2));
                    console.log('[ADS] Quality is restored after ads:', (quality === player.quality.bitrate ? 'PASS' : 'FAIL'));
                }
            }
        }
        console.log('[ADS] Completed test!');
    }
}