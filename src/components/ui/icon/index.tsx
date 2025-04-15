import { cn } from '@/utils';
import '@/styles/index.css';
import './style.css';

import flags from '@/assets/icons/flags.png';
import apple from '@/assets/icons/providers/apple.svg';
import atlassian from '@/assets/icons/providers/atlassian.svg';
import bitbucket from '@/assets/icons/providers/bitbucket.svg';
import discord from '@/assets/icons/providers/discord.svg';
import dropbox from '@/assets/icons/providers/dropbox.svg';
import facebook from '@/assets/icons/providers/facebook.svg';
import github from '@/assets/icons/providers/github.svg';
import gitlab from '@/assets/icons/providers/gitlab.svg';
import google from '@/assets/icons/providers/google.svg';
import hubspot from '@/assets/icons/providers/hubspot.svg';
import linear from '@/assets/icons/providers/linear.svg';
import linledin from '@/assets/icons/providers/linkedin.svg';
import microsoft from '@/assets/icons/providers/microsoft.svg';
import notion from '@/assets/icons/providers/notion.svg';
import slack from '@/assets/icons/providers/slack.svg';
import tiktok from '@/assets/icons/providers/tiktok.svg';
import twitch from '@/assets/icons/providers/twitch.svg';
import twitter from '@/assets/icons/providers/twitter.svg';
import xero from '@/assets/icons/providers/xero.svg';

import browserChrome from '@/assets/icons/general/browser-chrome.svg';
import caretDown from '@/assets/icons/general/caret-down.svg';
import check from '@/assets/icons/general/check.svg';
import close from '@/assets/icons/general/close.svg';
import dotsVertical from '@/assets/icons/general/dots-vertical.svg';
import edit from '@/assets/icons/general/edit.svg';
import eyeOff from '@/assets/icons/general/eye-off.svg';
import eyeOn from '@/assets/icons/general/eye-on.svg';
import key from '@/assets/icons/general/key.svg';
import label from '@/assets/icons/general/label.svg';
import logoRed from '@/assets/icons/general/logo-red.svg';
import logo from '@/assets/icons/general/logo.svg';
import mail from '@/assets/icons/general/mail.svg';
import onePassword from '@/assets/icons/general/one-password.svg';
import passkey from '@/assets/icons/general/passkey.svg';
import phone from '@/assets/icons/general/phone.svg';
import search from '@/assets/icons/general/search.svg';
import trash from '@/assets/icons/general/trash.svg';
import warning from '@/assets/icons/general/warning.svg';

type TIcon = {
  type: 'general' | 'providers' | 'flags';
  id: string;
  size: 'small' | 'medium' | 'big' | 'large';
  className?: string;
};

export const Icon = ({ type, id, size, className = '' }: TIcon) => {
  const styles = {
    'passflow-w-[16px] passflow-h-[16px]': size === 'small',
    'passflow-w-[20px] passflow-h-[20px]': size === 'medium',
    'passflow-w-[32px] passflow-h-[32px]': size === 'big',
    'passflow-w-[44px] passflow-h-[44px]': size === 'large',
  };

  const icons: Record<'providers' | 'general', Record<string, string>> = {
    general: {
      logo,
      'logo-red': logoRed,
      warning,
      mail,
      edit,
      'eye-on': eyeOn,
      'eye-off': eyeOff,
      search,
      'caret-down': caretDown,
      label,
      close,
      check,
      key,
      phone,
      'one-password': onePassword,
      'browser-chrome': browserChrome,
      passkey,
      'dots-vertical': dotsVertical,
      trash,
    },
    providers: {
      google,
      gitlab,
      apple,
      atlassian,
      bitbucket,
      discord,
      dropbox,
      facebook,
      github,
      hubspot,
      linear,
      linledin,
      microsoft,
      notion,
      slack,
      tiktok,
      twitch,
      twitter,
      xero,
    },
  };

  if (type !== 'flags') {
    return <img className={cn(styles, 'passflow-bg-transparent', className)} src={icons[type][id]} alt={id} />;
  }

  return (
    <div className={cn(styles, className)}>
      <div className={cn(`passflow-flag ${id.toLocaleLowerCase()}`)} style={{ backgroundImage: `url(${flags})` }} />
    </div>
  );
};
