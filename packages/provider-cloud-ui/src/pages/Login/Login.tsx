import {
    Box,
    Flex,
    Icon,
    IconButton,
    iconClose,
    iconExpandAccordion,
    Text,
} from '@waves.exchange/react-uikit';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { IUser } from '../../interface';
import { ForgotPassword } from '../../components/Auth/ForgotPassword';
import { SignInForm } from '../../components/Auth/SignInForm';
import { CodeConfirmation } from '../../components/Auth/CodeConfirmation';
import { SignUpForm } from '../../components/Auth/SignUpForm';
import { RegistrationSuccessful } from '../../components/Auth/RegistrationSuccessful';
import {
    AuthChallenge,
    CodeDelivery,
    IdentityService,
    SignUpResponse,
} from '../../services/IdentityService';
import { getGeeTestToken } from '../../utils/geeTest';
import { analytics } from '../../utils/analytics';
import { Enable2FaComponent } from '../../components/Enable2FA/Enable2FA';

type LoginStateType =
    | 'sign-up'
    | 'sign-in'
    | 'confirm-sign-up'
    | 'confirm-sign-in'
    | 'forgot-password'
    | 'success-sign-up'
    | 'enable-2fa';

type LoginProps = {
    identity: IdentityService;
    onConfirm(user: IUser): void;
    onCancel(): void;
};

const day = 1000 * 60 * 60 * 24;

export const Login: FC<LoginProps> = ({ identity, onConfirm, onCancel }) => {
    const [loginState, setLoginState] = useState<LoginStateType>('sign-in');
    const [codeDelivery, setCodeDelivery] = useState<CodeDelivery>();
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const userData = useRef<{ username: string; password: string }>();

    const handleSuccess = useCallback(() => {
        const enable2FATimestamp = Number(
            localStorage.getItem('enable2FATimestamp')
        );

        if (
            !is2FAEnabled &&
            (!enable2FATimestamp || Date.now() - enable2FATimestamp >= day)
        ) {
            setLoginState('enable-2fa');
            localStorage.setItem('enable2FATimestamp', Date.now().toString());

            return;
        }
        analytics.send({ name: 'Login_Page_SignIn_Success' });
        onConfirm({
            address: identity.getUserAddress(),
            publicKey: identity.getUserPublicKey(),
        });
    }, [identity, is2FAEnabled, onConfirm]);

    const onCloseClick = useCallback(() => {
        if (loginState === 'enable-2fa') {
            handleSuccess();
        } else {
            onCancel();
        }
    }, [handleSuccess, loginState, onCancel]);

    const resendSignUp = useCallback(async (): Promise<void> => {
        const result = await identity.resendSignUp();

        setCodeDelivery(result);
        setLoginState(
            loginState === 'sign-in' ? 'confirm-sign-in' : 'confirm-sign-up'
        );
    }, [identity]);

    const signIn = useCallback(
        async (username: string, password: string): Promise<void> => {
            try {
                const geeTest = await getGeeTestToken();

                const cognitoUser = await identity.signIn(
                    username,
                    password,
                    geeTest
                );

                const challengeName: AuthChallenge | void =
                    cognitoUser.challengeName;

                switch (challengeName) {
                    case 'SMS_MFA':
                        // TODO ???
                        setCodeDelivery({ type: 'SMS', destination: '' });
                        setLoginState('confirm-sign-in');
                        setIs2FAEnabled(true);
                        break;
                    case 'SOFTWARE_TOKEN_MFA':
                        setCodeDelivery({
                            type: 'TOTP',
                            destination: 'TOTP device',
                        });
                        setLoginState('confirm-sign-in');
                        setIs2FAEnabled(true);
                        break;
                    default:
                        handleSuccess();
                }
            } catch (e) {
                if (e && e.code === 'UserNotConfirmedException') {
                    userData.current = { username, password };
                    await resendSignUp();
                } else {
                    throw e;
                }
            }
        },
        [handleSuccess, identity, resendSignUp]
    );

    const signUp = useCallback(
        async (username: string, password: string): Promise<SignUpResponse> => {
            const geeTest = await getGeeTestToken();
            const result = await identity.signUp(username, password, geeTest);

            userData.current = {
                username,
                password,
            };

            if (result.userConfirmed === true) {
                await signIn(
                    userData.current.username,
                    userData.current.password
                );
                handleSuccess();
            } else {
                setCodeDelivery({
                    type: result.codeDeliveryDetails.DeliveryMedium,
                    destination: result.codeDeliveryDetails.Destination,
                });
                setLoginState('confirm-sign-up');
            }

            return result;
        },
        [handleSuccess, identity, signIn]
    );

    const confirmSignUp = useCallback(
        async (code: string): Promise<void> => {
            await identity.confirmSignUp(code);
            setLoginState('success-sign-up');
            // if (userData.current) {
            //     await signIn(
            //         userData.current.username,
            //         userData.current.password
            //     );
            // }

            // handleSuccess();
        },
        [handleSuccess, identity, signIn]
    );

    const confirmSignIn = useCallback(
        async (code: string): Promise<void> => {
            try {
                await identity.confirmSignIn(
                    code,
                    codeDelivery?.type === 'SMS'
                        ? 'SMS_MFA'
                        : 'SOFTWARE_TOKEN_MFA'
                );

                handleSuccess();
            } catch (e) {
                if (
                    e &&
                    e.code === 'NotAuthorizedException' &&
                    userData.current
                ) {
                    await signIn(
                        userData.current.username,
                        userData.current.password
                    );
                } else {
                    throw e;
                }
            }
        },
        [codeDelivery, handleSuccess, identity, signIn]
    );

    const resendSignIn = useCallback(async (): Promise<void> => {
        if (userData.current) {
            await signIn(userData.current.username, userData.current.password);
        }
    }, [signIn]);

    useEffect(() => {
        if (
            loginState !== 'confirm-sign-up' &&
            loginState !== 'confirm-sign-in'
        ) {
            setCodeDelivery(undefined);
        }
    }, [loginState]);

    return (
        <Box bg="main.$800" width="520px" borderRadius="$6">
            <Flex
                height={65}
                p="20px 24px 20px 40px"
                borderBottom="1px solid"
                borderColor="#3a4050"
                mb="32px"
                position="relative"
            >
                <Text
                    as="h2"
                    fontSize="17px"
                    lineHeight="24px"
                    mb="24px"
                    color="standard.$0"
                    fontWeight={500}
                    margin={0}
                >
                    {loginState === 'sign-in' && 'Log In'}
                    {loginState === 'sign-up' && 'Create Account'}
                    {loginState === 'success-sign-up' &&
                        'Registration Successful'}
                    {loginState === 'forgot-password' &&
                        'Forgot Your Password?'}
                    {loginState === 'confirm-sign-up' && (
                        <Text ml="10px">Verify Your Account</Text>
                    )}
                    {loginState === 'confirm-sign-in' && (
                        <Text ml="10px">Verify Your Account</Text>
                    )}
                    {loginState === 'enable-2fa' && (
                        <Text ml="10px">Enable 2FA</Text>
                    )}
                </Text>
                {(loginState === 'confirm-sign-up' ||
                    loginState === 'confirm-sign-in') && (
                    <IconButton
                        position="absolute"
                        top={22}
                        left={22}
                        size={20}
                        color="basic.$700"
                        _hover={{ color: 'basic.$500' }}
                        onClick={(): void => {
                            if (loginState === 'confirm-sign-up') {
                                setLoginState('sign-up');
                            }

                            if (loginState === 'confirm-sign-in') {
                                setLoginState('sign-in');
                            }
                        }}
                    >
                        <Icon
                            icon={iconExpandAccordion}
                            size={16}
                            sx={{ transform: 'rotate(90deg)' }}
                        />
                    </IconButton>
                )}

                <IconButton
                    ml="auto"
                    size={25}
                    color="basic.$700"
                    _hover={{ color: 'basic.$500' }}
                    onClick={onCloseClick}
                >
                    <Icon icon={iconClose} />
                </IconButton>
            </Flex>

            {loginState === 'sign-in' && (
                <SignInForm
                    signUpEmail={userData.current?.username}
                    signIn={signIn}
                    onForgotPasswordClick={(): void => {
                        setLoginState('forgot-password');
                    }}
                    onSignUpClick={(): void => {
                        setLoginState('sign-up');
                    }}
                />
            )}

            {loginState === 'sign-up' && (
                <SignUpForm
                    signUp={signUp}
                    onSignInClick={(): void => {
                        setLoginState('sign-in');
                    }}
                />
            )}

            {loginState === 'success-sign-up' && (
                <RegistrationSuccessful
                    onLogin={(): void => {
                        setLoginState('sign-in');
                    }}
                />
            )}

            {loginState === 'confirm-sign-up' && (
                <CodeConfirmation
                    codeDelivery={codeDelivery}
                    confirmCode={confirmSignUp}
                    resendCode={resendSignUp}
                />
            )}

            {loginState === 'confirm-sign-in' && (
                <CodeConfirmation
                    codeDelivery={codeDelivery}
                    confirmCode={confirmSignIn}
                    resendCode={
                        codeDelivery?.type === 'SMS' ? resendSignIn : undefined
                    }
                />
            )}

            {loginState === 'enable-2fa' && (
                <Enable2FaComponent
                    onClose={() => {
                        handleSuccess();
                    }}
                />
            )}

            {loginState === 'confirm-sign-up' ||
            loginState === 'confirm-sign-in' ||
            loginState === 'success-sign-up' ||
            loginState === 'forgot-password' ||
            loginState === 'enable-2fa' ? null : (
                <Box pb="32px" textAlign="center" fontWeight={300}>
                    <Text variant="footnote1" color="basic.$500">
                        Waves.Exchange
                    </Text>
                    <Text variant="footnote1" color="basic.$700">
                        {' '}
                        provider is used.{' '}
                    </Text>
                </Box>
            )}
        </Box>
    );
};
