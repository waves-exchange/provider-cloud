import { Bus, WindowAdapter } from '@waves/waves-browser-bus';
import { IBusEvents, TBusHandlers } from './interface';
import { Queue } from './utils/Queue';
import { getConnectHandler } from './handlers/connect';
import { getLoginHandler } from './handlers/login';
import { getSignHandler } from './handlers/sign';
import { getSignMessageHandler } from './handlers/signMessage';
import { IState } from './interface';
import { IdentityService } from './services/IdentityService';
import { analytics } from './utils/analytics';

const queue = new Queue(3);

const referrerURL = new URL(document.referrer);
const referrer = referrerURL.origin;
const referrerPathname = referrerURL.pathname?.replace('/', '').length
    ? referrerURL.pathname
    : undefined;

analytics.init({
    platform: 'web',
    userType: 'provider-cloud',
    referrer,
    referrerPathname,
});

WindowAdapter.createSimpleWindowAdapter()
    .then((adapter) => {
        const bus = new Bus<IBusEvents, TBusHandlers>(adapter);

        const state: IState = {
            user: null,
            networkByte: 87,
            nodeUrl: 'https://nodes.wavesplatform.com',
            identity: new IdentityService(),
        };

        bus.on('connect', getConnectHandler(state));

        bus.registerRequestHandler('login', getLoginHandler(queue, state));

        bus.registerRequestHandler(
            'sign-message',
            getSignMessageHandler(queue, state)
        );

        bus.registerRequestHandler('sign', getSignHandler(queue, state) as any);

        // TODO add matcher sign
        // TODO add remove order sign
        // TODO add create order sign

        bus.dispatchEvent('ready', void 0);

        window.addEventListener('unload', () => {
            bus.dispatchEvent('close', undefined);
        });
    })
    .catch(console.error);
