import React from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    const languages = [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
    ];

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLanguageChange = (languageCode) => {
        i18n.changeLanguage(languageCode);
        handleClose();
    };

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    return (
        <>
            <Tooltip title={i18n.language === 'ar' ? 'تغيير اللغة' : 'Change Language'}>
                <IconButton
                    onClick={handleClick}
                    size="small"
                    sx={{ ml: 2 }}
                    aria-controls={open ? 'language-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                >
                    <LanguageIcon />
                </IconButton>
            </Tooltip>

            <Menu
                id="language-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'language-button',
                }}
            >
                {languages.map((language) => (
                    <MenuItem
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        selected={language.code === i18n.language}
                    >
                        {language.code === i18n.language && (
                            <ListItemIcon>
                                <CheckIcon fontSize="small" />
                            </ListItemIcon>
                        )}
                        <ListItemText
                            inset={language.code !== i18n.language}
                            primary={language.nativeName}
                            secondary={language.name}
                        />
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

export default LanguageSwitcher;
