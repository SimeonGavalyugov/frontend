// @flow
import ophan from 'ophan/ng';
import userPrefs from 'common/modules/user-prefs';

export type Banner = {
    id: string,
    canShow: () => Promise<boolean>,
    show: () => void,
};

const init = (banners: Array<Banner>): Promise<void> => {
    const results: Array<'pending' | boolean> = new Array(banners.length).fill(
        'pending',
        0
    );

    const getSuccessfulBannerIndex = (): number => {
        const firstCheckPassedIndex = results.findIndex(item => item === true);

        // if no check has passed firstCheckPassedIndex equals -1
        // if first check has passed firstCheckPassedIndex equals 0
        if (firstCheckPassedIndex <= 0) {
            return firstCheckPassedIndex;
        }

        // if firstCheckPassedIndex greater than 0 then get higher priority checks from array that are pending
        const pendingHigherPriorityCheckIndex = results
            .slice(0, firstCheckPassedIndex)
            .findIndex(item => item === 'pending');

        // if there are no higher priority checks pending return firstCheckPassedIndex
        if (pendingHigherPriorityCheckIndex === -1) {
            return firstCheckPassedIndex;
        }

        return -1;
    };

    return new Promise(resolve => {
        const TIME_LIMIT = 2000;
        const messageStates = userPrefs.get('messages');

        banners.forEach((banner, index) => {
            const pushToResults = (result: boolean): void => {
                results[index] = result;

                const successfulBannerIndex = getSuccessfulBannerIndex();

                if (successfulBannerIndex !== -1) {
                    const successfulBanner = banners[successfulBannerIndex];
                    successfulBanner.show();

                    const trackingObj = {
                        component: 'banner-picker',
                        value: successfulBanner.id,
                    };

                    ophan.record(trackingObj);
                }

                if (!results.includes('pending')) {
                    resolve();
                }
            };

            const hasUserAcknowledgedBanner = (): boolean =>
                messageStates && messageStates.includes(banner.id);

            /**
             * if the banner has been seen and dismissed
             * we don't want to show it. Previously this rule was
             * enforced in the show() of Message.js
             * */
            if (hasUserAcknowledgedBanner()) {
                pushToResults(false);
            } else {
                let hasTimedOut = false;

                // checks that take longer than TIME_LIMIT are forced to fail
                const timeout = setTimeout(() => {
                    hasTimedOut = true;

                    pushToResults(false);

                    const trackingObj = {
                        component: 'banner-picker-timeout',
                        value: banner.id,
                    };

                    ophan.record(trackingObj);
                }, TIME_LIMIT);

                banner.canShow().then(result => {
                    if (!hasTimedOut) {
                        clearTimeout(timeout);
                        pushToResults(result);
                    }
                });
            }
        });
    });
};

export { init };