
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import type { User } from '@/lib/types';
import Link from 'next/link';

interface AccountRestrictedPageProps {
    userProfile: User;
}

export default function AccountRestrictedPage({ userProfile }: AccountRestrictedPageProps) {
    
    const supportLink = "https://wa.me/2347078907321?text=I%20have%20a%20query%20about%20my%20account%20status.";

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <ShieldAlert className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">Account Temporarily Restricted</CardTitle>
                    <CardDescription className="text-base">
                        For your security, access to certain features has been limited.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-left text-muted-foreground space-y-4">
                        <p>
                           This is a standard procedure to ensure the safety of your profile and assets while we complete a routine account review. This is often related to standard compliance checks or account verification and is typically resolved quickly.
                        </p>
                        <p className="font-semibold text-foreground">
                            Please be assured that all your funds, investments, and transaction history are secure and remain unaffected.
                        </p>
                    </div>
                    <Button asChild className="w-full">
                        <Link href={supportLink} target="_blank" rel="noopener noreferrer">
                            Contact Support
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
