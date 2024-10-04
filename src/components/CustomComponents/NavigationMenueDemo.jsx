import * as React from 'react';
import { Link } from 'react-router-dom';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';

export function NavigationMenuDemo({ links = [] }) {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        {links.map((link, index) => (
          <NavigationMenuItem key={index}>
            <Link href={link.path} passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                {link.name}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
