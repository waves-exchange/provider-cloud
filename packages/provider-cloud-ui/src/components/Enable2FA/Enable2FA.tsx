import * as React from 'react';
import {
    Box,
    Icon,
    PlateNote,
    Text,
    ExternalLink,
    Button,
} from '@waves.exchange/react-uikit';
import { iconAttention } from '../icons/iconAttention';

interface Enable2FaComponentProps {
    onClose: () => void;
}

export const Enable2FaComponent: React.FC<Enable2FaComponentProps> = (
    props
) => {
    return (
        <Box textAlign="center" px="40px" py="32px">
            <Icon size="80px" icon={iconAttention} color="#FFAF00" mb="32px" />
            <Text variant="heading2" display="block" color="#fff" mb="32px">
                Your account is at risk
            </Text>
            <PlateNote type={'warning'} mb="32px" p="16px">
                <Text
                    variant="body2"
                    color="#fff"
                    textAlign="left"
                    fontWeight={300}
                >
                    It is highly recommended to enable 2-factor authentification
                    as quickly as possible. Otherwise, your account is at risk.
                    You can enable 2FA in the Security section of your account
                    settings at &nbsp;
                    <ExternalLink href={'https://waves.exchange/sign-in/email'}>
                        Waves.Exchange.
                    </ExternalLink>
                </Text>
            </PlateNote>
            <ExternalLink href="https://waves.exchange/settings">
                <Button
                    variant="primary"
                    variantSize="medium"
                    width="100%"
                    onClick={props.onClose}
                >
                    Enable 2FA
                </Button>
            </ExternalLink>
        </Box>
    );
};
